const express = require('express');
const router = express.Router();
const { exec } = require("child_process");
const { Groq } = require("groq-sdk");
const PptxGenJS = require("pptxgenjs");
const NodeCache = require("node-cache");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Import models
const User = require('../models/User');
const GeneratedContent = require('../models/GeneratedContent');
const ChatHistory = require('../models/ChatHistory');
const ChatContext = require('../models/ChatContext');

// Import services
const ChatContextService = require('../services/chatContextService');
const RAGService = require('../services/ragService');

// Import prompt builder utility
const {
  getTokenCount,
  buildBlogPrompt,
  buildFlashcardPrompt,
  buildSlidesPrompt,
  buildQuizPrompt,
  buildSummaryPrompt
} = require('../utils/promptBuilder');

// Initialize services
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const transcriptCache = new NodeCache({ stdTTL: 600 }); // 600 seconds = 10 minutes
const chatContextService = new ChatContextService();
const ragService = new RAGService();

// Enhanced retry utility function with better error handling
async function withRetry(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`);
      const result = await operation();
      console.log(`Attempt ${attempt} succeeded`);
      return result;
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const waitTime = delay * attempt;
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.log(`All ${maxRetries} attempts failed`);
      }
    }
  }
  throw lastError;
}

// Enhanced JSON parsing with retry logic
async function parseAIResponseWithRetry(operation, maxRetries = 3) {
  return await withRetry(async () => {
    console.log("Executing AI operation...");
    const completion = await operation();
    
    if (!completion.choices?.[0]?.message?.content) {
      throw new Error("Invalid AI response format - no content");
    }

    let content = completion.choices[0].message.content
      .replace(/```json|```/g, "")
      .trim();

    console.log("Raw AI response length:", content.length);
    console.log("First 200 chars:", content.substring(0, 200));

    // Try to find and extract JSON array from the response
    const firstBracket = content.indexOf("[");
    const lastBracket = content.lastIndexOf("]");
    
    if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
      console.log("JSON array markers not found in response");
      throw new Error("JSON array not found in response - will retry");
    }
    
    const jsonArrayString = content.substring(firstBracket, lastBracket + 1);
    console.log("Extracted JSON string:", jsonArrayString.substring(0, 200) + "...");
    
    let parsedData;
    try {
      parsedData = JSON.parse(jsonArrayString);
    } catch (parseError) {
      console.log("JSON parsing failed:", parseError.message);
      throw new Error(`JSON parsing failed: ${parseError.message} - will retry`);
    }
    
    if (!Array.isArray(parsedData)) {
      throw new Error("Parsed JSON is not an array - will retry");
    }
    
    console.log(`Successfully parsed array with ${parsedData.length} items`);
    return parsedData;
  }, maxRetries);
}

// Helper: Extract transcript text from YouTube URL using Python script
async function getTranscriptText(url) {
  const videoId = new URL(url).searchParams.get("v");
  if (!videoId) throw new Error("Invalid YouTube URL");

  const cacheKey = `transcript:${videoId}`;
  const cached = transcriptCache.get(cacheKey);
  if (cached) return cached;

  return new Promise((resolve, reject) => {
    // Execute the Python script, passing the videoId as an argument
    // Ensure 'python' is in your PATH, or use the full path to the python executable
    // The Python script should print the full transcript text to stdout
    exec(`python get_transcript.py ${videoId}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject(new Error(`Failed to get transcript from Python script: ${stderr}`));
      }
      if (stderr) {
        console.warn(`Python script stderr: ${stderr}`);
      }
      const fullText = stdout.trim();
      if (!fullText) {
        return reject(new Error("Python script returned empty transcript."));
      }
      transcriptCache.set(cacheKey, fullText);
      resolve(fullText);
    });
  });
}

// ========== PLAYLIST HELPER FUNCTIONS (NEW) ==========

/**
 * Helper: Get playlist information using Python script
 * Returns playlist metadata and list of video IDs
 */
async function getPlaylistInfo(playlistUrl) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const pythonProcess = spawn('python', [
      path.join(__dirname, '../get_playlist.py'),
      playlistUrl
    ]);

    let dataString = '';
    let errorString = '';
    
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python playlist script error:', errorString);
        return reject(new Error(`Playlist extraction failed: ${errorString}`));
      }

      try {
        const result = JSON.parse(dataString);
        if (result.success) {
          console.log(`Playlist info extracted: ${result.video_count} videos found`);
          resolve(result);
        } else {
          reject(new Error(result.error || 'Failed to extract playlist info'));
        }
      } catch (error) {
        console.error('Failed to parse playlist response:', dataString);
        reject(new Error(`Failed to parse playlist data: ${error.message}`));
      }
    });
  });
}

/**
 * Helper: Get transcripts for multiple videos with delay
 * Returns object with transcripts for each video ID
 */
async function getBatchTranscripts(videoIds, delaySeconds = 5) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    
    // Prepare arguments: video IDs + delay parameter
    const args = [
      path.join(__dirname, '../get_batch_transcripts.py'),
      `--delay=${delaySeconds}`,
      ...videoIds
    ];
    
    const pythonProcess = spawn('python', args);

    let dataString = '';
    let errorString = '';
    
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      const message = data.toString();
      errorString += message;
      // Log progress messages for debugging
      if (message.includes('Progress:')) {
        console.log(message.trim());
      }
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python batch transcript script error:', errorString);
        return reject(new Error(`Batch transcript fetching failed: ${errorString}`));
      }

      try {
        const result = JSON.parse(dataString);
        console.log(`Batch transcripts: ${result.successful} successful, ${result.failed} failed`);
        resolve(result);
      } catch (error) {
        console.error('Failed to parse batch transcript response:', dataString);
        reject(new Error(`Failed to parse batch transcript data: ${error.message}`));
      }
    });
  });
}

/**
 * Helper: Check if URL is a playlist or single video
 */
function isPlaylistUrl(url) {
  return url.includes('list=') && (url.includes('playlist') || url.includes('watch'));
}

// ========== END OF PLAYLIST HELPER FUNCTIONS ==========


/**
 * BLOG GENERATION
 */
router.post("/generate-blog", verifyToken, async (req, res) => {
  try {
    // Accept either URL or direct text content
    const transcriptText = req.body.textContent 
      ? req.body.textContent 
      : await getTranscriptText(req.body.url);
    const userId = req.user.uid; // Get userId from verified token

    // Fetch user preferences
    const user = await User.findOne({ uid: userId });
    const userPreferences = user?.preferences || {};

    // Get dynamic token count based on preferences
    const maxTokens = getTokenCount('blog', userPreferences);

    // Build personalized prompt
    const systemPrompt = buildBlogPrompt(userPreferences);
    
    // Get word count requirement for user message reminder
    const blogLength = userPreferences?.contentPreferences?.blogLength || 'medium';
    const wordCounts = {
      brief: { min: 800, max: 1200, target: 1000 },
      medium: { min: 1500, max: 2000, target: 1750 },
      detailed: { min: 2500, max: 3500, target: 3000 }
    };
    const wordCount = wordCounts[blogLength] || wordCounts.medium;
    
    // Add word count reminder to user message
    const userMessage = `${transcriptText}\n\n⚠️ REMINDER: Generate a blog post with ${wordCount.min}-${wordCount.max} words (target: ${wordCount.target} words). Ensure you meet the minimum word count requirement.`;

    const completion = await withRetry(async () => {
      const result = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: maxTokens, // Dynamic based on preferences
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          { role: "user", content: userMessage },
        ],
      });

      if (!result.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response format");
      }

      return result;
    }, 3);

    const blogPost = completion.choices[0].message.content.replace(
      /```html|```/g,
      ""
    );

    // Attempt to extract a title from the blog post for storage
    const titleMatch = blogPost.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const title = titleMatch 
      ? titleMatch[1].trim() 
      : (req.body.url ? `Blog Post from ${req.body.url}` : 'Blog Post from Text');

    // Save generated content to MongoDB
    const newContent = new GeneratedContent({
      userId,
      type: 'blog',
      title: title,
      contentData: blogPost,
      url: req.body.url || null
    });
    await newContent.save();
    console.log(`Saved new blog post (ID: ${newContent._id}) to database.`);

    // Process content for RAG (async, don't wait)
    ragService.processContent(
      userId,
      newContent._id,
      'blog',
      blogPost,
      { url: req.body.url || null, title }
    ).catch(err => {
      console.error('Error processing blog for RAG:', err);
      // Don't fail the request if RAG processing fails
    });

    res.json({ blogPost, contentId: newContent._id });
  } catch (error) {
    console.error("Blog error:", error.message);
    res.status(500).json({ error: "Error generating blog post" });
  }
});

/**
 * FLASHCARD GENERATION
 */
router.post("/generate-flashcards", verifyToken, async (req, res) => {
  try {
    // Accept either URL or direct text content
    const transcriptText = req.body.textContent 
      ? req.body.textContent 
      : await getTranscriptText(req.body.url);
    const userId = req.user.uid;

    // Fetch user preferences
    const user = await User.findOne({ uid: userId });
    const userPreferences = user?.preferences || {};

    // Get dynamic token count based on preferences
    const maxTokens = getTokenCount('flashcards', userPreferences);

    // Build personalized prompt
    const systemPrompt = buildFlashcardPrompt(userPreferences);

    const flashcards = await parseAIResponseWithRetry(async () => {
      return await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: maxTokens, // Dynamic based on preferences
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          { role: "user", content: transcriptText },
        ],
      });
    }, 3);

    // Validate each flashcard has required fields
    const validFlashcards = flashcards.filter(card => 
      card && typeof card === 'object' && 
      typeof card.question === 'string' && card.question.trim() &&
      typeof card.answer === 'string' && card.answer.trim()
    );
    
    if (validFlashcards.length === 0) {
      throw new Error("No valid flashcards found in response");
    }
    
    console.log(`Generated ${validFlashcards.length} valid flashcards`);

    // Save generated content to MongoDB
    const newContent = new GeneratedContent({
      userId,
      type: 'flashcards',
      title: req.body.url ? `Flashcards from ${req.body.url}` : 'Flashcards from Text',
      contentData: validFlashcards,
      url: req.body.url || null
    });
    await newContent.save();
    console.log(`Saved new flashcards (ID: ${newContent._id}) to database.`);

    // Process content for RAG (async, don't wait)
    ragService.processContent(
      userId,
      newContent._id,
      'flashcards',
      validFlashcards,
      { url: req.body.url || null }
    ).catch(err => {
      console.error('Error processing flashcards for RAG:', err);
    });

    res.json({ flashcards: validFlashcards, contentId: newContent._id });
    
  } catch (error) {
    console.error("Flashcard error:", error.message);
    res.status(500).json({ 
      error: "Failed to generate flashcards",
      details: error.message 
    });
  }
});

/**
 * SLIDES GENERATION
 */
router.post("/generate-slides", verifyToken, async (req, res) => {
  const { url, textContent } = req.body;
  const userId = req.user.uid;

  try {
    // Accept either URL or direct text content
    let transcriptText;
    if (textContent) {
      transcriptText = textContent;
    } else {
      const videoId = new URL(url).searchParams.get("v");
      if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });
      transcriptText = await getTranscriptText(url);
    }

    // Fetch user preferences
    const user = await User.findOne({ uid: userId });
    const userPreferences = user?.preferences || {};

    // Get dynamic token count based on preferences
    const maxTokens = getTokenCount('slides', userPreferences);

    // Build personalized prompt
    const systemPrompt = buildSlidesPrompt(userPreferences);

    const slides = await parseAIResponseWithRetry(async () => {
      return await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: maxTokens, // Dynamic based on preferences
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: transcriptText,
          },
        ],
      });
    }, 3);

    // Validate slide structure (accept both 'content' and 'points' for backward compatibility)
    const validSlides = slides.filter(slide => 
      slide && typeof slide === 'object' && 
      typeof slide.title === 'string' && slide.title.trim() &&
      (Array.isArray(slide.content) || Array.isArray(slide.points)) &&
      (slide.content?.length > 0 || slide.points?.length > 0)
    );

    if (validSlides.length === 0) {
      throw new Error("No valid slides found in response");
    }

    console.log(`Generated ${validSlides.length} valid slides`);

    // Generate PowerPoint with enhanced formatting
    const pptx = new PptxGenJS();
    
    // Set presentation properties
    pptx.defineLayout({ name: 'A4', width: 10, height: 7.5 });
    pptx.layout = 'A4';
    
    // Add title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: '1E3A8A' }; // Blue background
    titleSlide.addText('Educational Presentation', {
      x: 1,
      y: 2,
      w: 8,
      h: 1.5,
      fontSize: 36,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle'
    });
    titleSlide.addText(`Generated from: ${url || 'Text Content'}`, {
      x: 1,
      y: 4,
      w: 8,
      h: 0.5,
      fontSize: 16,
      color: 'E5E7EB',
      align: 'center',
      valign: 'middle'
    });
    titleSlide.addText(`Created: ${new Date().toLocaleDateString()}`, {
      x: 1,
      y: 5,
      w: 8,
      h: 0.5,
      fontSize: 14,
      color: '9CA3AF',
      align: 'center',
      valign: 'middle'
    });

    // Add content slides with enhanced formatting
    validSlides.forEach((slide, index) => {
      const s = pptx.addSlide();
      
      // Add header with gradient background
      s.addShape('rect', {
        x: 0,
        y: 0,
        w: 10,
        h: 1.2,
        fill: { color: '3B82F6' }
      });
      
      // Add slide number
      s.addText(`${index + 1}`, {
        x: 8.5,
        y: 0.1,
        w: 1,
        h: 0.3,
        fontSize: 14,
        color: 'FFFFFF',
        align: 'center',
        bold: true
      });
      
      // Add slide title with better styling
      s.addText(slide.title, {
        x: 0.5,
        y: 0.2,
        w: 8,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: 'FFFFFF',
        align: 'left',
        valign: 'middle'
      });
      
      // Add content area with background
      s.addShape('rect', {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 5.5,
        fill: { color: 'F8FAFC' },
        line: { color: 'E2E8F0', width: 1 }
      });
      
      // Get bullet points from either 'content' or 'points' array
      const pointsArray = slide.content || slide.points || [];
      
      // Add bullet points as single text element with proper line spacing
      const bulletPoints = pointsArray.map((point, pointIndex) => {
        return `• ${point}`;
      }).join('\n'); // Single line break between bullet points
      
      s.addText(bulletPoints, {
        x: 1.0,
        y: 2.0,
        w: 8.0,
        h: 4.5,
        fontSize: 16,
        color: '1F2937',
        align: 'left',
        valign: 'top',
        lineSpacing: 24, // Line spacing in points (1.0 = 24 points)
        autoFit: true,
        margin: [0.1, 0.1, 0.1, 0.1] // Add margins to prevent text from touching edges
      });
      
      // Add footer
      s.addShape('rect', {
        x: 0,
        y: 6.8,
        w: 10,
        h: 0.7,
        fill: { color: 'F1F5F9' }
      });
      
      s.addText('EduExtract - Educational Content Platform', {
        x: 0.5,
        y: 6.9,
        w: 4,
        h: 0.3,
        fontSize: 12,
        color: '6B7280',
        align: 'left'
      });
      
      s.addText(`Slide ${index + 1} of ${validSlides.length}`, {
        x: 7,
        y: 6.9,
        w: 2.5,
        h: 0.3,
        fontSize: 12,
        color: '6B7280',
        align: 'right'
      });
    });

    const b64 = await pptx.write("base64");

    // Save generated content to MongoDB
    const newContent = new GeneratedContent({
      userId,
      type: 'slides',
      title: url ? `Slides from ${url}` : 'Slides from Text',
      contentData: validSlides, // Storing the slide array
      url: url || null
    });
    await newContent.save();
    console.log(`Saved new slides (ID: ${newContent._id}) to database.`);

    // Process content for RAG (async, don't wait)
    ragService.processContent(
      userId,
      newContent._id,
      'slides',
      validSlides,
      { url: url || null }
    ).catch(err => {
      console.error('Error processing slides for RAG:', err);
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="presentation.pptx"'
    );
    
    console.log(`Generated ${validSlides.length} slides successfully`);
    res.json({
      pptxBase64: b64,
      slides: validSlides,
      success: true,
      contentId: newContent._id
    });
  } catch (error) {
    console.error("Error generating .pptx:", error.message);
    res.status(500).json({ error: "Failed to generate PowerPoint file" });
  }
});

/**
 * QUIZ GENERATION
 */
router.post("/generate-quiz", verifyToken, async (req, res) => {
  try {
    // Accept either URL or direct text content
    const transcriptText = req.body.textContent 
      ? req.body.textContent 
      : await getTranscriptText(req.body.url);
    const userId = req.user.uid;

    // Fetch user preferences
    const user = await User.findOne({ uid: userId });
    const userPreferences = user?.preferences || {};

    // Get dynamic token count based on preferences
    const maxTokens = getTokenCount('quiz', userPreferences);

    // Build personalized prompt
    const systemPrompt = buildQuizPrompt(userPreferences);

    const quiz = await parseAIResponseWithRetry(async () => {
      return await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: maxTokens, // Dynamic based on preferences
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          { role: "user", content: transcriptText },
        ],
      });
    }, 3);

    // Validate quiz structure (supports both correctAnswer and answer for backward compatibility)
    const validQuiz = quiz.filter(q => {
      if (!q || typeof q !== 'object') return false;
      if (!q.question || typeof q.question !== 'string' || !q.question.trim()) return false;
      if (!Array.isArray(q.options) || q.options.length < 2) return false;
      
      // Support both 'correctAnswer' (new format) and 'answer' (old format)
      const correctAnswer = q.correctAnswer || q.answer;
      if (!correctAnswer || typeof correctAnswer !== 'string' || !correctAnswer.trim()) return false;
      if (!q.options.includes(correctAnswer)) return false;
      
      // Normalize to use correctAnswer
      if (q.answer && !q.correctAnswer) {
        q.correctAnswer = q.answer;
        delete q.answer;
      }
      
      // Make explanation optional (may be incomplete if response was truncated)
      if (q.explanation && typeof q.explanation !== 'string') {
        q.explanation = '';
      }
      
      return true;
    });

    if (validQuiz.length === 0) {
      throw new Error("No valid quiz questions found in response");
    }

    console.log(`Generated ${validQuiz.length} valid quiz questions`);

    // Save generated content to MongoDB
    const newContent = new GeneratedContent({
      userId,
      type: 'quiz',
      title: req.body.url ? `Quiz from ${req.body.url}` : 'Quiz from Text',
      contentData: validQuiz,
      url: req.body.url || null
    });
    await newContent.save();
    console.log(`Saved new quiz (ID: ${newContent._id}) to database.`);

    // Process content for RAG (async, don't wait)
    ragService.processContent(
      userId,
      newContent._id,
      'quiz',
      validQuiz,
      { url: req.body.url || null }
    ).catch(err => {
      console.error('Error processing quiz for RAG:', err);
    });

    res.json({ quiz: validQuiz, contentId: newContent._id });
  } catch (error) {
    console.error("Quiz error:", error.message);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});

/**
 * SUMMARY GENERATION
 */
router.post("/generate-summary", verifyToken, async (req, res) => {
  const { url, textContent } = req.body;
  const userId = req.user.uid;

  try {
    // Accept either URL or direct text content
    let transcriptText;
    if (textContent) {
      transcriptText = textContent;
    } else {
      const videoId = new URL(url).searchParams.get("v");
      if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });
      transcriptText = await getTranscriptText(url);
    }
    
    console.log(`Processing transcript for summary (${transcriptText.length} characters)`);
    
    // Validate transcript content
    if (!transcriptText || transcriptText.trim().length < 50) {
      return res.status(400).json({ error: "Transcript is too short or empty" });
    }

    // Fetch user preferences
    const user = await User.findOne({ uid: userId });
    const userPreferences = user?.preferences || {};

    // Get dynamic token count based on preferences
    const maxTokens = getTokenCount('summary', userPreferences);

    // Build personalized prompt
    const systemPrompt = buildSummaryPrompt(userPreferences);

    const chatCompletion = await withRetry(async () => {
      const result = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: maxTokens, // Dynamic based on preferences
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Please summarize this content:\n\n${transcriptText}`,
          },
        ],
      });

      if (!result.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response format");
      }

      return result;
    }, 3);

    let summary = chatCompletion.choices[0].message.content;
    
    // Remove code blocks and markdown formatting
    summary = summary.replace(/```(html|json|text|markdown)?/g, "").trim();
    
    // Remove any potential prefixes like "Summary:" or "Video Summary:" or "Here is..."
    summary = summary.replace(/^(here is (the|a)?|summary|video summary):\s*/i, "");
    summary = summary.replace(/^(here's (the|a)?)\s*/i, "");
    
    // Clean up nested p tags around headings (common AI mistake)
    summary = summary.replace(/<p>\s*<h([1-6])>/g, '<h$1>');
    summary = summary.replace(/<\/h([1-6])>\s*<\/p>/g, '</h$1>');
    summary = summary.replace(/<p><\/p>/g, '');

    console.log(`Generated summary successfully (${summary.length} characters)`);
    
    // Save generated content to MongoDB
    const newContent = new GeneratedContent({
      userId,
      type: 'summary',
      title: url ? `Summary from ${url}` : 'Summary from Text',
      contentData: summary,
      url: url || null
    });
    await newContent.save();
    console.log(`Saved new summary (ID: ${newContent._id}) to database.`);

    // Process content for RAG (async, don't wait)
    ragService.processContent(
      userId,
      newContent._id,
      'summary',
      summary,
      { url: url || null }
    ).catch(err => {
      console.error('Error processing summary for RAG:', err);
    });

    res.json({ summary, contentId: newContent._id });
  } catch (error) {
    console.error("Summary generation error:", error.message);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

/**
 * ENHANCED CHATBOT ENDPOINT WITH RAG (RETRIEVAL-AUGMENTED GENERATION)
 */
router.post("/api/chat", verifyToken, async (req, res) => {
  try {
    const { messages, contentContext, sessionId } = req.body;
    const userId = req.user.uid;
    const userName = req.user.name || req.user.email?.split('@')[0] || 'User';

    console.log(`Chat request from user ${userId}, session: ${sessionId || 'new'}`);

    // Get or create chat session
    let chatSession = null;
    if (sessionId) {
      chatSession = await ChatHistory.findOne({ userId, sessionId });
    }
    
    if (!chatSession) {
      const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      chatSession = await ChatHistory.createSession(userId, newSessionId);
      console.log(`Created new chat session: ${newSessionId}`);
    }

    // Get the user's latest message for RAG retrieval
    const userMessage = messages && messages.length > 0 
      ? messages[messages.length - 1].content 
      : '';

    // Build context using RAG
    let contextualPrompt = "You are a helpful educational assistant for EduExtract. You can help users with understanding content, navigating the app, and answering questions about educational materials. Be concise and friendly in your responses.";
    
    if (contentContext || userMessage) {
      try {
        console.log('Building RAG context for chat...');
        
        // Retrieve relevant chunks using RAG
        let relevantChunks = [];
        if (userMessage) {
          try {
            relevantChunks = await ragService.retrieveRelevantChunks(userMessage, {
              userId,
              limit: 5,
              minSimilarity: 0.7
            });
            console.log(`Retrieved ${relevantChunks.length} relevant chunks from RAG`);
          } catch (ragError) {
            console.error('Error retrieving RAG chunks:', ragError);
            // Continue without RAG chunks if retrieval fails
          }
        }

        // Build context from RAG chunks and current session
        const currentSessionContent = contentContext?.currentSession || {};
        const originalSource = contentContext?.originalSource || null;
        
        const ragContext = ragService.buildContextFromChunks(
          relevantChunks,
          currentSessionContent,
          originalSource
        );

        if (ragContext) {
          contextualPrompt = `You are an AI tutor for ${userName} using EduExtract, an educational content platform. You have access to their learning materials and can help them understand, revise, and create new educational content.

IMPORTANT: Use the following context to provide accurate and relevant answers. Reference specific content when relevant.

${ragContext}

You can help the user by:
- Explaining concepts from their generated content
- Answering questions about their learning materials
- Suggesting improvements to their content
- Creating new educational materials based on their existing content
- Connecting ideas between different pieces of content they've created

Be helpful, educational, and reference their specific content when relevant.`;
        } else {
          // Fallback to simple context if RAG fails
          const context = await chatContextService.buildUserContext(
            userId,
            currentSessionContent,
            originalSource
          );
          contextualPrompt = chatContextService.createContextualPrompt(context, userName);
        }
        
        // Update session with context snapshot
        chatSession.contextSnapshot = {
          ragEnabled: relevantChunks.length > 0,
          chunksRetrieved: relevantChunks.length,
          hasCurrentSession: Object.keys(currentSessionContent).length > 0,
          hasOriginalSource: !!originalSource
        };
        await chatSession.save();
        
        console.log(`RAG context built successfully. Chunks: ${relevantChunks.length}`);
      } catch (contextError) {
        console.error('Error building RAG context:', contextError);
        // Continue with basic prompt if context building fails
      }
    }

    // Prepare messages with contextual system prompt
    const systemPrompt = {
      role: "system",
      content: contextualPrompt
    };

    // Get recent messages from session (last 10)
    const recentMessages = chatSession.getRecentMessages(10);
    
    // Clean recent messages to remove _id property that Groq doesn't support
    const cleanRecentMessages = recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Combine system prompt, recent messages, and new messages
    const finalMessages = [systemPrompt, ...cleanRecentMessages, ...messages];

    console.log(`Sending ${finalMessages.length} messages to AI (including system prompt and ${cleanRecentMessages.length} recent messages)`);

    const completion = await withRetry(async () => {
      const result = await groq.chat.completions.create({
        messages: finalMessages,
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: 1024,
      });

      if (!result.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response format");
      }

      return result;
    }, 3);

    const finishReason = completion.choices[0]?.finish_reason;
    if (finishReason === "length") {
      console.log("Max tokens reached. Truncating response.");
    }

    const aiResponse = completion.choices[0]?.message?.content;
    
    // Save the conversation to chat history
    try {
      // Add user message
      await chatSession.addMessage('user', messages[messages.length - 1].content);
      
      // Add AI response
      await chatSession.addMessage('assistant', aiResponse);
      
      console.log(`Saved conversation to session ${chatSession.sessionId}`);
    } catch (saveError) {
      console.error('Error saving chat history:', saveError);
      // Don't fail the request if saving history fails
    }

    res.json({ 
      message: aiResponse,
      sessionId: chatSession.sessionId,
      contextLoaded: !!contentContext
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to get response from AI" });
  }
});

/**
 * GET USER'S CONTENT CONTEXT FOR CHATBOT
 */
router.get("/api/chat/context", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    console.log(`Fetching context for user: ${userId}`);
    
    // Fetch user's recent content
    const userHistory = await chatContextService.fetchUserHistory(userId);
    
    // Format the context for frontend
    const contextSummary = {
      totalItems: userHistory.length,
      recentItems: userHistory.slice(0, 10).map(item => ({
        id: item._id,
        type: item.type,
        title: item.title,
        createdAt: item.createdAt,
        preview: chatContextService.getContentPreview(item.contentData, item.type)
      })),
      contentTypes: userHistory.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {})
    };
    
    res.json({
      success: true,
      context: contextSummary
    });
  } catch (error) {
    console.error("Error fetching chat context:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch context" 
    });
  }
});

/**
 * GET CHAT HISTORY FOR USER
 */
router.get("/api/chat/history", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 10;
    
    const chatHistory = await ChatHistory.getUserHistory(userId, limit);
    
    res.json({
      success: true,
      history: chatHistory
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch chat history" 
    });
  }
});

/**
 * GET SPECIFIC CHAT SESSION
 */
router.get("/api/chat/history/:sessionId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const sessionId = req.params.sessionId;
    
    const session = await ChatHistory.findOne({ userId, sessionId });
    
    if (!session) {
      return res.status(404).json({ 
        success: false,
        error: "Session not found" 
      });
    }
    
    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        messages: session.messages,
        contextSnapshot: session.contextSnapshot,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    });
  } catch (error) {
    console.error("Error fetching chat session:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch chat session" 
    });
  }
});

// Helper function to save user content
async function saveUserContent(userId, title, type, originalContent, generatedContent) {
  try {
    const newContent = new GeneratedContent({
      userId,
      type,
      title,
      contentData: generatedContent,
      originalContent: originalContent
    });
    await newContent.save();
    return newContent;
  } catch (error) {
    console.error('Error saving user content:', error);
    throw error;
  }
}

// Helper function to cleanup uploaded files
function cleanupFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up file: ${filePath}`);
    } catch (error) {
      console.error(`Error cleaning up file ${filePath}:`, error);
    }
  }
}

// File content extraction endpoint for preview
router.post("/extract-file-content", verifyToken, upload.single('file'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    filePath = req.file.path;
    console.log(`Extracting content from file: ${req.file.originalname}`);

    // Extract text content from file
    let fileContent = "";
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    if (fileExtension === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      fileContent = pdfData.text;
    } else if (fileExtension === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      fileContent = result.value;
    } else if (fileExtension === '.txt') {
      fileContent = fs.readFileSync(filePath, 'utf8');
    } else if (fileExtension === '.pptx') {
      return res.status(400).json({ error: "PPTX file content extraction not yet implemented. Please use PDF, DOCX, or TXT files." });
    } else {
      return res.status(400).json({ error: "Unsupported file type. Please upload PDF, DOCX, or TXT files." });
    }

    if (!fileContent.trim()) {
      return res.status(400).json({ error: "No text content found in the file" });
    }

    console.log(`Extracted ${fileContent.length} characters from file`);

    // Clean up the file
    cleanupFile(filePath);

    res.json({
      success: true,
      content: fileContent,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });

  } catch (error) {
    console.error('File content extraction error:', error);
    
    // Clean up the file in case of error
    if (filePath) {
      cleanupFile(filePath);
    }
    
    res.status(500).json({ 
      error: 'Failed to extract file content',
      details: error.message 
    });
  }
});

// File processing endpoint
router.post("/process-file", verifyToken, upload.single('file'), async (req, res) => {
  const { type } = req.body;
  const userId = req.user.uid;
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!type) {
      return res.status(400).json({ error: "Content type is required" });
    }

    filePath = req.file.path;
    console.log(`Processing file: ${req.file.originalname} for ${type}`);

    // Extract text content from file
    let fileContent = "";
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    if (fileExtension === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      fileContent = pdfData.text;
    } else if (fileExtension === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      fileContent = result.value;
    } else if (fileExtension === '.txt') {
      fileContent = fs.readFileSync(filePath, 'utf8');
    } else if (fileExtension === '.pptx') {
      // For PPTX files, we'll need to implement extraction
      return res.status(400).json({ error: "PPTX file processing not yet implemented. Please use PDF, DOCX, or TXT files." });
    } else {
      return res.status(400).json({ error: "Unsupported file type. Please upload PDF, DOCX, or TXT files." });
    }

    if (!fileContent.trim()) {
      return res.status(400).json({ error: "No text content found in the file" });
    }

    console.log(`Extracted ${fileContent.length} characters from file`);

    // Fetch user preferences
    const user = await User.findOne({ uid: userId });
    const userPreferences = user?.preferences || {};

    let generatedContentData;
    let contentTitle;
    let result;

    // Generate content based on type
    switch (type) {
      case 'blog':
        // Get dynamic token count based on preferences
        const blogMaxTokens = getTokenCount('blog', userPreferences);
        // Build personalized prompt
        const blogSystemPrompt = buildBlogPrompt(userPreferences);
        
        // Get word count requirement for user message reminder
        const blogLength = userPreferences?.contentPreferences?.blogLength || 'medium';
        const blogWordCounts = {
          brief: { min: 800, max: 1200, target: 1000 },
          medium: { min: 1500, max: 2000, target: 1750 },
          detailed: { min: 2500, max: 3500, target: 3000 }
        };
        const blogWordCount = blogWordCounts[blogLength] || blogWordCounts.medium;
        
        // Add word count reminder to user message
        const blogUserMessage = `${fileContent}\n\n⚠️ REMINDER: Generate a blog post with ${blogWordCount.min}-${blogWordCount.max} words (target: ${blogWordCount.target} words). Ensure you meet the minimum word count requirement.`;
        
        const blogCompletion = await withRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: blogMaxTokens, // Dynamic based on preferences
            messages: [
              {
                role: "system",
                content: blogSystemPrompt
              },
              { role: "user", content: blogUserMessage },
            ],
          });
        }, 3);
        
        generatedContentData = blogCompletion.choices[0].message.content.replace(
          /```html|```/g,
          ""
        );
        contentTitle = `Blog from ${req.file.originalname}`;
        result = { blog: generatedContentData };
        break;

      case 'flashcards':
        // Get dynamic token count based on preferences
        const flashcardMaxTokens = getTokenCount('flashcards', userPreferences);
        // Build personalized prompt
        const flashcardSystemPrompt = buildFlashcardPrompt(userPreferences);
        
        const flashcards = await parseAIResponseWithRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: flashcardMaxTokens, // Dynamic based on preferences
            messages: [
              {
                role: "system",
                content: flashcardSystemPrompt
              },
              { role: "user", content: fileContent },
            ],
          });
        }, 3);

        // Validate each flashcard has required fields
        const validFlashcards = flashcards.filter(card => 
          card && typeof card === 'object' && 
          typeof card.question === 'string' && card.question.trim() &&
          typeof card.answer === 'string' && card.answer.trim()
        );
        
        if (validFlashcards.length === 0) {
          throw new Error("No valid flashcards found in response");
        }
        
        console.log(`Generated ${validFlashcards.length} valid flashcards`);
        
        generatedContentData = validFlashcards;
        contentTitle = `Flashcards from ${req.file.originalname}`;
        result = { flashcards: validFlashcards };
        break;

      case 'slides':
        // Get dynamic token count based on preferences
        const slidesMaxTokens = getTokenCount('slides', userPreferences);
        // Build personalized prompt
        const slidesSystemPrompt = buildSlidesPrompt(userPreferences);
        
        const slides = await parseAIResponseWithRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: slidesMaxTokens, // Dynamic based on preferences
            messages: [
              {
                role: "system",
                content: slidesSystemPrompt
              },
              { role: "user", content: fileContent },
            ],
          });
        }, 3);

        // Validate slide structure (accept both 'content' and 'points' for backward compatibility)
        const validSlides = slides.filter(slide => 
          slide && typeof slide === 'object' && 
          typeof slide.title === 'string' && slide.title.trim() &&
          (Array.isArray(slide.content) || Array.isArray(slide.points)) &&
          (slide.content?.length > 0 || slide.points?.length > 0)
        );

        if (validSlides.length === 0) {
          throw new Error("No valid slides found in response");
        }

        console.log(`Generated ${validSlides.length} valid slides`);
        
        // Generate PowerPoint with enhanced formatting
        const pptx = new PptxGenJS();
        
        // Set presentation properties
        pptx.defineLayout({ name: 'A4', width: 10, height: 7.5 });
        pptx.layout = 'A4';
        
        // Add title slide
        const titleSlide = pptx.addSlide();
        titleSlide.background = { color: '1E3A8A' }; // Blue background
        titleSlide.addText('Educational Presentation', {
          x: 1,
          y: 2,
          w: 8,
          h: 1.5,
          fontSize: 36,
          bold: true,
          color: 'FFFFFF',
          align: 'center',
          valign: 'middle'
        });
        titleSlide.addText(`Generated from: ${req.file.originalname}`, {
          x: 1,
          y: 4,
          w: 8,
          h: 0.5,
          fontSize: 16,
          color: 'E5E7EB',
          align: 'center',
          valign: 'middle'
        });
        titleSlide.addText(`Created: ${new Date().toLocaleDateString()}`, {
          x: 1,
          y: 5,
          w: 8,
          h: 0.5,
          fontSize: 14,
          color: '9CA3AF',
          align: 'center',
          valign: 'middle'
        });

        // Add content slides with enhanced formatting
        validSlides.forEach((slide, index) => {
          const s = pptx.addSlide();
          
          // Add header with gradient background
          s.addShape('rect', {
            x: 0,
            y: 0,
            w: 10,
            h: 1.2,
            fill: { color: '3B82F6' }
          });
          
          // Add slide number
          s.addText(`${index + 1}`, {
            x: 8.5,
            y: 0.1,
            w: 1,
            h: 0.3,
            fontSize: 14,
            color: 'FFFFFF',
            align: 'center',
            bold: true
          });
          
          // Add slide title with better styling
          s.addText(slide.title, {
            x: 0.5,
            y: 0.2,
            w: 8,
            h: 0.8,
            fontSize: 28,
            bold: true,
            color: 'FFFFFF',
            align: 'left',
            valign: 'middle'
          });
          
          // Add content area with background
          s.addShape('rect', {
            x: 0.5,
            y: 1.5,
            w: 9,
            h: 5.5,
            fill: { color: 'F8FAFC' },
            line: { color: 'E2E8F0', width: 1 }
          });
          
          // Get bullet points from either 'content' or 'points' array
          const pointsArray = slide.content || slide.points || [];
          
          // Add bullet points as single text element with proper line spacing
          const bulletPoints = pointsArray.map((point, pointIndex) => {
            return `• ${point}`;
          }).join('\n'); // Single line break between bullet points
          
          s.addText(bulletPoints, {
            x: 1.0,
            y: 2.0,
            w: 8.0,
            h: 4.5,
            fontSize: 16,
            color: '1F2937',
            align: 'left',
            valign: 'top',
            lineSpacing: 24, // Line spacing in points (1.0 = 24 points)
            autoFit: true,
            margin: [0.1, 0.1, 0.1, 0.1] // Add margins to prevent text from touching edges
          });
          
          // Add footer
          s.addShape('rect', {
            x: 0,
            y: 6.8,
            w: 10,
            h: 0.7,
            fill: { color: 'F1F5F9' }
          });
          
          s.addText('EduExtract - Educational Content Platform', {
            x: 0.5,
            y: 6.9,
            w: 4,
            h: 0.3,
            fontSize: 12,
            color: '6B7280',
            align: 'left'
          });
          
          s.addText(`Slide ${index + 1} of ${validSlides.length}`, {
            x: 7,
            y: 6.9,
            w: 2.5,
            h: 0.3,
            fontSize: 12,
            color: '6B7280',
            align: 'right'
          });
        });

        const b64 = await pptx.write("base64");
        
        generatedContentData = validSlides;
        contentTitle = `Slides from ${req.file.originalname}`;
        result = { 
          slides: validSlides,
          pptxBase64: b64
        };
        break;

      case 'quiz':
        // Get dynamic token count based on preferences
        const quizMaxTokens = getTokenCount('quiz', userPreferences);
        // Build personalized prompt
        const quizSystemPrompt = buildQuizPrompt(userPreferences);
        
        const quiz = await parseAIResponseWithRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: quizMaxTokens, // Dynamic based on preferences
            messages: [
              {
                role: "system",
                content: quizSystemPrompt
              },
              { role: "user", content: fileContent },
            ],
          });
        }, 3);

        // Validate quiz structure (supports both correctAnswer and answer for backward compatibility)
        const validQuiz = quiz.filter(q => {
          if (!q || typeof q !== 'object') return false;
          if (!q.question || typeof q.question !== 'string' || !q.question.trim()) return false;
          if (!Array.isArray(q.options) || q.options.length < 2) return false;
          
          // Support both 'correctAnswer' (new format) and 'answer' (old format)
          const correctAnswer = q.correctAnswer || q.answer;
          if (!correctAnswer || typeof correctAnswer !== 'string' || !correctAnswer.trim()) return false;
          if (!q.options.includes(correctAnswer)) return false;
          
          // Normalize to use correctAnswer
          if (q.answer && !q.correctAnswer) {
            q.correctAnswer = q.answer;
            delete q.answer;
          }
          
          // Make explanation optional (may be incomplete if response was truncated)
          if (q.explanation && typeof q.explanation !== 'string') {
            q.explanation = '';
          }
          
          return true;
        });

        if (validQuiz.length === 0) {
          throw new Error("No valid quiz questions found in response");
        }

        console.log(`Generated ${validQuiz.length} valid quiz questions`);
        
        generatedContentData = validQuiz;
        contentTitle = `Quiz from ${req.file.originalname}`;
        result = { quiz: validQuiz };
        break;

      case 'summary':
        // Get dynamic token count based on preferences
        const summaryMaxTokens = getTokenCount('summary', userPreferences);
        // Build personalized prompt
        const summarySystemPrompt = buildSummaryPrompt(userPreferences);
        
        const summaryCompletion = await withRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: summaryMaxTokens, // Dynamic based on preferences
            messages: [
              {
                role: "system",
                content: summarySystemPrompt
              },
              { role: "user", content: `Please summarize this content:\n\n${fileContent}` },
            ],
          });
        }, 3);
        
        let summary = summaryCompletion.choices[0].message.content;
        
        // Remove code blocks and markdown formatting
        summary = summary.replace(/```(html|json|text|markdown)?/g, "").trim();
        
        // Remove any potential prefixes like "Summary:" or "Video Summary:" or "Here is..."
        summary = summary.replace(/^(here is (the|a)?|summary|video summary|content summary):\s*/i, "");
        summary = summary.replace(/^(here's (the|a)?)\s*/i, "");
        
        // Clean up nested p tags around headings (common AI mistake)
        summary = summary.replace(/<p>\s*<h([1-6])>/g, '<h$1>');
        summary = summary.replace(/<\/h([1-6])>\s*<\/p>/g, '</h$1>');
        summary = summary.replace(/<p><\/p>/g, '');
        
        generatedContentData = summary;
        contentTitle = `Summary from ${req.file.originalname}`;
        result = { summary: generatedContentData };
        break;

      default:
        return res.status(400).json({ error: "Invalid content type" });
    }

    // Save generated content to MongoDB
    const savedContent = await saveUserContent(userId, contentTitle, type, fileContent, generatedContentData);

    // Process content for RAG (async, don't wait)
    ragService.processContent(
      userId,
      savedContent._id,
      type,
      generatedContentData,
      { fileName: req.file.originalname }
    ).catch(err => {
      console.error(`Error processing ${type} for RAG:`, err);
    });

    // Add contentId to the response
    result.contentId = savedContent._id;

    console.log(`Successfully processed file for ${type}`);
    res.json(result);
  } catch (error) {
    console.error("File processing error:", error);
    res.status(500).json({ 
      error: "Error processing file",
      details: error.message 
    });
  } finally {
    // Clean up the uploaded file
    cleanupFile(filePath);
  }
});

// Import download service
const downloadService = require('../services/downloadService');

// Download endpoints for all content types
router.post("/download-blog", verifyToken, async (req, res) => {
  try {
    const { blogContent, title } = req.body;
    
    if (!blogContent) {
      return res.status(400).json({ error: "Blog content is required" });
    }

    const pdfBuffer = await downloadService.downloadBlog(blogContent, title || "Generated Blog");
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${(title || 'Generated_Blog').replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Blog download error:", error);
    res.status(500).json({ error: "Failed to generate blog PDF" });
  }
});

router.post("/download-summary", verifyToken, async (req, res) => {
  try {
    const { summary, title } = req.body;
    
    if (!summary) {
      return res.status(400).json({ error: "Summary content is required" });
    }

    const pdfBuffer = await downloadService.downloadSummary(summary, title || "Content Summary");
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${(title || 'Content_Summary').replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Summary download error:", error);
    res.status(500).json({ error: "Failed to generate summary PDF" });
  }
});

router.post("/download-quiz", verifyToken, async (req, res) => {
  try {
    const { quiz, title } = req.body;
    
    if (!quiz || !Array.isArray(quiz)) {
      return res.status(400).json({ error: "Quiz data is required" });
    }

    const pdfBuffer = await downloadService.downloadQuiz(quiz, title || "Quiz");
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${(title || 'Quiz').replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Quiz download error:", error);
    res.status(500).json({ error: "Failed to generate quiz PDF" });
  }
});

router.post("/download-flashcards", verifyToken, async (req, res) => {
  try {
    const { flashcards, title } = req.body;
    
    if (!flashcards || !Array.isArray(flashcards)) {
      return res.status(400).json({ error: "Flashcards data is required" });
    }

    const pdfBuffer = await downloadService.downloadFlashcards(flashcards, title || "Flashcards");
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${(title || 'Flashcards').replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Flashcards download error:", error);
    res.status(500).json({ error: "Failed to generate flashcards PDF" });
  }
});

// Download slides as PowerPoint
router.post('/download-slides', verifyToken, async (req, res) => {
  try {
    const { slides, title } = req.body;
    
    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ error: 'No slides data provided' });
    }

    // Generate PowerPoint with enhanced formatting
    const pptx = new PptxGenJS();
    
    // Set presentation properties
    pptx.defineLayout({ name: 'A4', width: 10, height: 7.5 });
    pptx.layout = 'A4';
    
    // Add title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: '1E3A8A' }; // Blue background
    titleSlide.addText('Educational Presentation', {
      x: 1,
      y: 2,
      w: 8,
      h: 1.5,
      fontSize: 36,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle'
    });
    titleSlide.addText(`Generated from: ${title || 'Content'}`, {
      x: 1,
      y: 4,
      w: 8,
      h: 0.5,
      fontSize: 16,
      color: 'E5E7EB',
      align: 'center',
      valign: 'middle'
    });
    titleSlide.addText(`Created: ${new Date().toLocaleDateString()}`, {
      x: 1,
      y: 5,
      w: 8,
      h: 0.5,
      fontSize: 14,
      color: '9CA3AF',
      align: 'center',
      valign: 'middle'
    });

    // Add content slides with enhanced formatting
    slides.forEach((slide, index) => {
      const s = pptx.addSlide();
      
      // Add header with gradient background
      s.addShape('rect', {
        x: 0,
        y: 0,
        w: 10,
        h: 1.2,
        fill: { color: '3B82F6' }
      });
      
      // Add slide number
      s.addText(`${index + 1}`, {
        x: 8.5,
        y: 0.1,
        w: 1,
        h: 0.3,
        fontSize: 14,
        color: 'FFFFFF',
        align: 'center',
        bold: true
      });
      
      // Add slide title with better styling
      s.addText(slide.title, {
        x: 0.5,
        y: 0.2,
        w: 8,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: 'FFFFFF',
        align: 'left',
        valign: 'middle'
      });
      
      // Add content area with background
      s.addShape('rect', {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 5.5,
        fill: { color: 'F8FAFC' },
        line: { color: 'E2E8F0', width: 1 }
      });
      
      // Get bullet points from either 'content' or 'points' array
      const pointsArray = slide.content || slide.points || [];
      
      // Add bullet points as single text element with proper line spacing
      const bulletPoints = pointsArray.map((point, pointIndex) => {
        return `• ${point}`;
      }).join('\n'); // Single line break between bullet points
      
      s.addText(bulletPoints, {
        x: 1.0,
        y: 2.0,
        w: 8.0,
        h: 4.5,
        fontSize: 16,
        color: '1F2937',
        align: 'left',
        valign: 'top',
        lineSpacing: 24, // Line spacing in points (1.0 = 24 points)
        autoFit: true,
        margin: [0.1, 0.1, 0.1, 0.1] // Add margins to prevent text from touching edges
      });
      
      // Add footer
      s.addShape('rect', {
        x: 0,
        y: 6.8,
        w: 10,
        h: 0.7,
        fill: { color: 'F1F5F9' }
      });
      
      s.addText('EduExtract - Educational Content Platform', {
        x: 0.5,
        y: 6.9,
        w: 4,
        h: 0.3,
        fontSize: 12,
        color: '6B7280',
        align: 'left'
      });
      
      s.addText(`Slide ${index + 1} of ${slides.length}`, {
        x: 7,
        y: 6.9,
        w: 2.5,
        h: 0.3,
        fontSize: 12,
        color: '6B7280',
        align: 'right'
      });
    });

    const pptxBuffer = await pptx.write("nodebuffer");
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${(title || 'Slides').replace(/[^a-zA-Z0-9]/g, '_')}.pptx"`);
    res.send(pptxBuffer);
  } catch (error) {
    console.error("Slides download error:", error);
    res.status(500).json({ error: "Failed to generate slides PowerPoint" });
  }
});

/**
 * STORE CHAT CONTEXT IN DATABASE
 */
router.post("/api/chat/context/store", verifyToken, async (req, res) => {
  try {
    const { context } = req.body;
    const userId = req.user.uid;
    const sessionId = `chat_context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`Storing chat context for user: ${userId}, session: ${sessionId}`);

    // Delete any existing context for this user
    await ChatContext.deleteMany({ userId });

    // Store context in MongoDB
    const chatContext = new ChatContext({
      userId,
      context,
      sessionId
    });

    await chatContext.save();

    console.log(`Context stored in MongoDB for user: ${userId}`);

    res.json({
      success: true,
      message: "Context stored successfully",
      sessionId
    });
  } catch (error) {
    console.error("Error storing chat context:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to store context" 
    });
  }
});

/**
 * GET CHAT CONTEXT FROM DATABASE
 */
router.get("/api/chat/context/fetch", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    console.log(`Fetching chat context for user: ${userId}`);

    // Get context from MongoDB
    const contextData = await ChatContext.findOne({ userId }).sort({ createdAt: -1 });

    if (!contextData) {
      return res.json({
        success: true,
        context: null,
        message: "No context found"
      });
    }

    console.log(`Context retrieved from MongoDB for user: ${userId}`);

    res.json({
      success: true,
      context: contextData.context
    });
  } catch (error) {
    console.error("Error fetching chat context:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch context" 
    });
  }
});

/**
 * DELETE CHAT CONTEXT FROM DATABASE
 */
router.delete("/api/chat/context/delete", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    console.log(`Deleting chat context for user: ${userId}`);

    // Delete context from MongoDB
    await ChatContext.deleteMany({ userId });

    console.log(`Context deleted from MongoDB for user: ${userId}`);

    res.json({
      success: true,
      message: "Context deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting chat context:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete context" 
    });
  }
});

/**
 * FETCH YOUTUBE TRANSCRIPT
 */
router.post("/api/transcript", verifyToken, async (req, res) => {
  try {
    const { url } = req.body;
    const userId = req.user.uid;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    console.log(`Fetching transcript for user: ${userId}, URL: ${url}`);

    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const transcriptText = await getTranscriptText(url);
    
    console.log(`Transcript fetched successfully (${transcriptText.length} characters)`);

    res.json({
      success: true,
      transcript: transcriptText,
      videoId: videoId,
      url: url
    });
  } catch (error) {
    console.error("Error fetching transcript:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch transcript",
      details: error.message 
    });
  }
});

/**
 * RESTRICTED CHAT ENDPOINT - Only uses current file/video content
 */
router.post("/api/chat/restricted", verifyToken, async (req, res) => {
  try {
    const { messages, contentContext, sessionId } = req.body;
    const userId = req.user.uid;
    const userName = req.user.name || req.user.email?.split('@')[0] || 'User';

    console.log(`Restricted chat request from user ${userId}, session: ${sessionId || 'new'}`);

    let chatSession = null;
    if (sessionId) {
      chatSession = await ChatHistory.findOne({ userId, sessionId });
    }
    
    if (!chatSession) {
      const newSessionId = sessionId || `restricted_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      chatSession = await ChatHistory.createSession(userId, newSessionId);
      console.log(`Created new restricted chat session: ${newSessionId}`);
    }

    let contextualPrompt = "You are a helpful educational assistant for EduExtract. You can help users with understanding content, navigating the app, and answering questions about educational materials. Be concise and friendly in your responses.";
    
    if (contentContext) {
      try {
        console.log('Building restricted context for embedded chat...');
        
        // Build restricted context - only current file/video content
        const restrictedContext = {
          currentSession: contentContext.currentSession || {},
          originalSource: contentContext.originalSource || null,
          metadata: {
            currentSessionItems: Object.keys(contentContext.currentSession || {}).length,
            hasOriginalSource: !!contentContext.originalSource,
            isRestricted: true
          }
        };
        
        // Create restricted prompt
        contextualPrompt = `You are an AI tutor for ${userName} using EduExtract. You can ONLY answer questions based on the current file or video content that the user has uploaded/processed.

CRITICAL RESTRICTIONS:
- You MUST ONLY use information from the current file/video content provided below
- Do NOT use any external knowledge or general information
- If a question cannot be answered from the provided content, say "I can only answer questions based on the current file/video content you've uploaded. Please ask something related to that content."
- Do NOT reference any previous content or user history
- Stay strictly within the bounds of the provided content`;

        if (restrictedContext.originalSource) {
          contextualPrompt += `\n\nCURRENT FILE/VIDEO CONTENT (Your ONLY source of information):`;
          contextualPrompt += `\nType: ${restrictedContext.originalSource.type}`;
          if (restrictedContext.originalSource.url) {
            contextualPrompt += `\nSource: ${restrictedContext.originalSource.url}`;
          }
          contextualPrompt += `\nContent: ${restrictedContext.originalSource.content}`;
        }

        if (restrictedContext.currentSession && Object.keys(restrictedContext.currentSession).length > 0) {
          contextualPrompt += `\n\nGENERATED CONTENT FROM CURRENT FILE/VIDEO:`;
          Object.keys(restrictedContext.currentSession).forEach(type => {
            const content = restrictedContext.currentSession[type];
            if (content) {
              contextualPrompt += `\n\n${type.toUpperCase()}:`;
              if (typeof content.content === 'string') {
                contextualPrompt += `\n${content.content}`;
              } else if (typeof content.content === 'object') {
                contextualPrompt += `\n${JSON.stringify(content.content, null, 2)}`;
              }
            }
          });
        }

        contextualPrompt += `\n\nYou can help the user by:
- Explaining concepts ONLY from the current file/video content
- Answering questions ONLY about the current file/video content
- Creating new educational materials ONLY based on the current file/video content
- Summarizing or analyzing ONLY the current file/video content

REMEMBER: You are restricted to ONLY the content provided above. Do not use any external knowledge.`;
        
        chatSession.contextSnapshot = restrictedContext;
        await chatSession.save();
        
        console.log(`Restricted context built successfully. Current session items: ${restrictedContext.metadata.currentSessionItems}, has original source: ${restrictedContext.metadata.hasOriginalSource}`);
      } catch (contextError) {
        console.error('Error building restricted context:', contextError);
      }
    }

    const systemPrompt = {
      role: "system",
      content: contextualPrompt
    };

    const recentMessages = chatSession.getRecentMessages(10);
    const cleanRecentMessages = recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    const finalMessages = [systemPrompt, ...cleanRecentMessages, ...messages];

    console.log(`Sending ${finalMessages.length} messages to AI (including restricted system prompt and ${cleanRecentMessages.length} recent messages)`);

    const completion = await withRetry(async () => {
      const result = await groq.chat.completions.create({
        messages: finalMessages,
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: 1024,
      });

      if (!result.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response format");
      }

      return result;
    }, 3);

    const finishReason = completion.choices[0]?.finish_reason;
    if (finishReason === "length") {
      console.log("Max tokens reached. Truncating response.");
    }

    const aiResponse = completion.choices[0]?.message?.content;
    
    try {
      await chatSession.addMessage('user', messages[messages.length - 1].content);
      await chatSession.addMessage('assistant', aiResponse);
      console.log(`Saved restricted conversation to session ${chatSession.sessionId}`);
    } catch (saveError) {
      console.error('Error saving restricted chat history:', saveError);
    }

    res.json({ 
      message: aiResponse,
      sessionId: chatSession.sessionId,
      contextLoaded: !!contentContext,
      isRestricted: true
    });
  } catch (error) {
    console.error("Restricted chat error:", error);
    res.status(500).json({ error: "Failed to get response from AI" });
  }
});

/**
 * PLAYLIST URL DETECTION (NEW)
 * Check if a URL is a playlist and get playlist info
 */
router.post("/check-url-type", verifyToken, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !url.includes('youtube.com')) {
      return res.status(400).json({ 
        error: 'Invalid URL. Please provide a valid YouTube URL.' 
      });
    }

    // Check if it's a playlist URL
    if (isPlaylistUrl(url)) {
      try {
        const playlistInfo = await getPlaylistInfo(url);
        
        return res.json({
          type: 'playlist',
          playlist_title: playlistInfo.playlist_title,
          playlist_id: playlistInfo.playlist_id,
          video_count: playlistInfo.video_count,
          uploader: playlistInfo.uploader,
          videos: playlistInfo.videos.slice(0, 5) // Send only first 5 for preview
        });
      } catch (error) {
        console.error('Failed to get playlist info:', error);
        return res.status(400).json({ 
          error: `Failed to extract playlist information: ${error.message}` 
        });
      }
    } else {
      // It's a single video
      const videoId = new URL(url).searchParams.get("v");
      if (!videoId) {
        return res.status(400).json({ 
          error: 'Invalid YouTube video URL' 
        });
      }

      return res.json({
        type: 'video',
        video_id: videoId
      });
    }
  } catch (error) {
    console.error("URL type check error:", error);
    res.status(500).json({ error: "Failed to check URL type" });
  }
});

/**
 * GENERATE FROM PLAYLIST (NEW)
 * Generate content from all videos in a playlist
 */
router.post("/generate-from-playlist", verifyToken, async (req, res) => {
  try {
    const { url, contentType, selectedVideoIds } = req.body;
    const userId = req.user.uid;

    if (!url || !contentType) {
      return res.status(400).json({ 
        error: 'Missing required fields: url and contentType' 
      });
    }

    // Get playlist information
    const playlistInfo = await getPlaylistInfo(url);
    
    if (!playlistInfo.success) {
      return res.status(400).json({ 
        error: playlistInfo.error || 'Failed to get playlist information' 
      });
    }

    // Determine which videos to process
    let videoIdsToProcess;
    if (selectedVideoIds && selectedVideoIds.length > 0) {
      videoIdsToProcess = selectedVideoIds;
    } else {
      // Debug: log the first video structure
      if (playlistInfo.videos && playlistInfo.videos.length > 0) {
        console.log('First video structure:', JSON.stringify(playlistInfo.videos[0], null, 2));
      }
      videoIdsToProcess = playlistInfo.videos.map(v => v.id || v.video_id);
    }

    console.log(`Processing ${videoIdsToProcess.length} videos from playlist...`);
    console.log('Video IDs:', videoIdsToProcess.slice(0, 5), '...');

    // Fetch all transcripts with 5-second delay
    const transcriptResults = await getBatchTranscripts(videoIdsToProcess, 5);

    // Combine all successful transcripts
    let combinedTranscript = '';
    let processedCount = 0;
    
    for (const videoId of videoIdsToProcess) {
      const result = transcriptResults.transcripts[videoId];
      if (result && result.success) {
        combinedTranscript += `\n\n--- Video ${processedCount + 1}: ${result.video_id} ---\n\n`;
        combinedTranscript += result.text;
        processedCount++;
      }
    }

    if (processedCount === 0) {
      return res.status(400).json({ 
        error: 'Failed to fetch transcripts for any videos in the playlist' 
      });
    }

    console.log(`Successfully combined transcripts from ${processedCount} videos`);
    console.log(`Combined transcript length: ${combinedTranscript.length} characters`);

    // Return the combined transcript for the frontend to process
    // The frontend will call the appropriate generate endpoint
    res.json({
      success: true,
      playlist_title: playlistInfo.playlist_title,
      processed_videos: processedCount,
      total_videos: videoIdsToProcess.length,
      combined_transcript: combinedTranscript,
      failed_videos: transcriptResults.failed
    });

  } catch (error) {
    console.error("Playlist generation error:", error);
    res.status(500).json({ 
      error: `Failed to process playlist: ${error.message}` 
    });
  }
});

module.exports = router;
