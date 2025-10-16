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

// Initialize services
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const transcriptCache = new NodeCache({ stdTTL: 600 }); // 600 seconds = 10 minutes
const chatContextService = new ChatContextService();

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


/**
 * BLOG GENERATION
 */
router.post("/generate-blog", verifyToken, async (req, res) => {
  try {
    const transcriptText = await getTranscriptText(req.body.url);
    const userId = req.user.uid; // Get userId from verified token


    const completion = await withRetry(async () => {
      const result = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7, // Reduced for more consistent output
        max_tokens: 2048,
        messages: [
          {
            role: "system",
            content: `Generate a professional, well-structured HTML blog post (2000+ words) based on the transcript.
            - Use <h1> for title, <h2> for sections, <h3> for sub-sections.
            - Include an engaging introduction and a thoughtful conclusion.
            - Use <p> for paragraphs, <ul><li> for lists, and emphasize key points with <b> or <i>.
            - Return only valid HTML without CSS or markdown.
            - Do not include any JSON formatting or code blocks.`,
          },
          { role: "user", content: transcriptText },
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
    const title = titleMatch ? titleMatch[1].trim() : `Blog Post from ${req.body.url}`;

    // Save generated content to MongoDB
    const newContent = new GeneratedContent({
      userId,
      type: 'blog',
      title: title,
      contentData: blogPost,
      url: req.body.url
    });
    await newContent.save();
    console.log(`Saved new blog post (ID: ${newContent._id}) to database.`);

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
    const transcriptText = await getTranscriptText(req.body.url);
    const userId = req.user.uid;


    const flashcards = await parseAIResponseWithRetry(async () => {
      return await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: `Generate exactly 5-8 educational flashcards as a JSON array.
Each flashcard must have exactly these fields:
{
  "question": "Clear, specific question text",
  "answer": "Concise, accurate answer text"
}

IMPORTANT:
- Return ONLY a valid JSON array
- No markdown, no code blocks, no explanations
- Each question should be educational and based on the content
- Start response with [ and end with ]
- Example format: [{"question":"What is...?","answer":"It is..."},{"question":"How does...?","answer":"It works by..."}]`,
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
      title: `Flashcards from ${req.body.url}`,
      contentData: validFlashcards,
      url: req.body.url
    });
    await newContent.save();
    console.log(`Saved new flashcards (ID: ${newContent._id}) to database.`);

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
  const { url } = req.body;
  const userId = req.user.uid;

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });


    // Using the updated getTranscriptText function
    const transcriptText = await getTranscriptText(url);

    const slides = await parseAIResponseWithRetry(async () => {
      return await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content: `Create exactly 6-10 slide objects based on this transcript. 
Return a valid JSON array where each object has:
{
  "title": "Clear slide title",
  "points": ["Bullet point 1", "Bullet point 2", "Bullet point 3"]
}

IMPORTANT:
- Return ONLY a valid JSON array
- No markdown, no code blocks, no explanations
- Each slide should have 2-4 bullet points
- Start response with [ and end with ]
- Points should be clear and concise`,
          },
          {
            role: "user",
            content: transcriptText,
          },
        ],
      });
    }, 3);

    // Validate slide structure
    const validSlides = slides.filter(slide => 
      slide && typeof slide === 'object' && 
      typeof slide.title === 'string' && slide.title.trim() &&
      Array.isArray(slide.points) && slide.points.length > 0
    );

    if (validSlides.length === 0) {
      throw new Error("No valid slides found in response");
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
    titleSlide.addText(`Generated from: ${url}`, {
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
      
      // Add bullet points as single text element with proper line spacing
      const bulletPoints = slide.points.map((point, pointIndex) => {
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
      title: `Slides from ${url}`,
      contentData: validSlides, // Storing the slide array
      url: url
    });
    await newContent.save();
    console.log(`Saved new slides (ID: ${newContent._id}) to database.`);

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
    const transcriptText = await getTranscriptText(req.body.url);
    const userId = req.user.uid;


    const quiz = await parseAIResponseWithRetry(async () => {
      return await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: `Generate exactly 6-8 multiple-choice quiz questions in JSON format.
Each object must include:
{
  "question": "Clear question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "Option A"
}

IMPORTANT:
- Return ONLY a valid JSON array
- No markdown, no code blocks, no explanations
- Each question should have exactly 4 options
- The answer should be one of the options (exact match)
- Start response with [ and end with ]`,
          },
          { role: "user", content: transcriptText },
        ],
      });
    }, 3);

    // Validate quiz structure
    const validQuiz = quiz.filter(q => 
      q && typeof q === 'object' && 
      typeof q.question === 'string' && q.question.trim() &&
      Array.isArray(q.options) && q.options.length === 4 &&
      typeof q.answer === 'string' && q.answer.trim() &&
      q.options.includes(q.answer)
    );

    if (validQuiz.length === 0) {
      throw new Error("No valid quiz questions found in response");
    }

    console.log(`Generated ${validQuiz.length} valid quiz questions`);

    // Save generated content to MongoDB
    const newContent = new GeneratedContent({
      userId,
      type: 'quiz',
      title: `Quiz from ${req.body.url}`,
      contentData: validQuiz,
      url: req.body.url
    });
    await newContent.save();
    console.log(`Saved new quiz (ID: ${newContent._id}) to database.`);

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
  const { url } = req.body;
  const userId = req.user.uid;

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });


    // Use the cached transcript function for consistency
    const transcriptText = await getTranscriptText(url);
    
    console.log(`Processing transcript for summary (${transcriptText.length} characters)`);
    
    // Validate transcript content
    if (!transcriptText || transcriptText.trim().length < 50) {
      return res.status(400).json({ error: "Transcript is too short or empty" });
    }

    const chatCompletion = await withRetry(async () => {
      const result = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: 512,
        messages: [
          {
            role: "system",
            content: `You are tasked with creating a summary of a video transcript. 
            Create a concise and informative summary that:
            - Is 150-200 words long
            - Focuses on the main topics and key points
            - Uses clear, engaging prose
            - Does not use markdown, code formatting, or bullet points
            - Provides value to someone who hasn't watched the video
            
            The user will provide the transcript content for you to summarize.`,
          },
          {
            role: "user",
            content: `Please summarize this video transcript:\n\n${transcriptText}`,
          },
        ],
      });

      if (!result.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response format");
      }

      return result;
    }, 3);

    let summary = chatCompletion.choices[0].message.content;
    summary = summary.replace(/```(json|text)?/g, "").trim();
    
    // Remove any potential prefixes like "Summary:" or "Video Summary:"
    summary = summary.replace(/^(summary|video summary):\s*/i, "");

    console.log(`Generated summary successfully (${summary.length} characters)`);
    
    // Save generated content to MongoDB
    const newContent = new GeneratedContent({
      userId,
      type: 'summary',
      title: `Summary from ${url}`,
      contentData: summary,
      url: url
    });
    await newContent.save();
    console.log(`Saved new summary (ID: ${newContent._id}) to database.`);

    res.json({ summary, contentId: newContent._id });
  } catch (error) {
    console.error("Summary generation error:", error.message);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

/**
 * ENHANCED CHATBOT ENDPOINT WITH CONTEXT AWARENESS
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

    // Build context if provided
    let contextualPrompt = "You are a helpful educational assistant for EduExtract. You can help users with understanding content, navigating the app, and answering questions about educational materials. Be concise and friendly in your responses.";
    
    if (contentContext) {
      try {
        console.log('Building context for chat...');
        const context = await chatContextService.buildUserContext(
          userId,
          contentContext.currentSession || {},
          contentContext.originalSource || null
        );
        
        contextualPrompt = chatContextService.createContextualPrompt(context, userName);
        
        // Update session with context snapshot
        chatSession.contextSnapshot = context;
        await chatSession.save();
        
        console.log(`Context built successfully. Token estimate: ${chatContextService.estimateTokenCount(context)}`);
      } catch (contextError) {
        console.error('Error building context:', contextError);
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

    let generatedContentData;
    let contentTitle;
    let result;

    // Generate content based on type
    switch (type) {
      case 'blog':
        const blogCompletion = await withRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: 2048,
            messages: [
              {
                role: "system",
                content: `Generate a professional, well-structured HTML blog post (2000+ words) based on the provided content.
                - Use <h1> for title, <h2> for sections, <h3> for sub-sections.
                - Include an engaging introduction and a thoughtful conclusion.
                - Use <p> for paragraphs, <ul><li> for lists, and emphasize key points with <b> or <i>.
                - Return only valid HTML without CSS or markdown.
                - Do not include any JSON formatting or code blocks.`,
              },
              { role: "user", content: fileContent },
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
        const flashcards = await parseAIResponseWithRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: 1024,
            messages: [
              {
                role: "system",
                content: `Generate exactly 5-8 educational flashcards as a JSON array.
Each flashcard must have exactly these fields:
{
  "question": "Clear, specific question text",
  "answer": "Concise, accurate answer text"
}

IMPORTANT:
- Return ONLY a valid JSON array
- No markdown, no code blocks, no explanations
- Each question should be educational and based on the content
- Start response with [ and end with ]
- Example format: [{"question":"What is...?","answer":"It is..."},{"question":"How does...?","answer":"It works by..."}]`,
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
        const slides = await parseAIResponseWithRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: 1500,
            messages: [
              {
                role: "system",
                content: `Create exactly 6-10 slide objects based on this content. 
Return a valid JSON array where each object has:
{
  "title": "Clear slide title",
  "points": ["Bullet point 1", "Bullet point 2", "Bullet point 3"]
}

IMPORTANT:
- Return ONLY a valid JSON array
- No markdown, no code blocks, no explanations
- Each slide should have 2-4 bullet points
- Start response with [ and end with ]
- Points should be clear and concise`,
              },
              { role: "user", content: fileContent },
            ],
          });
        }, 3);

        // Validate slide structure
        const validSlides = slides.filter(slide => 
          slide && typeof slide === 'object' && 
          typeof slide.title === 'string' && slide.title.trim() &&
          Array.isArray(slide.points) && slide.points.length > 0
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
          
          // Add bullet points as single text element with proper line spacing
          const bulletPoints = slide.points.map((point, pointIndex) => {
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
        const quiz = await parseAIResponseWithRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: 1200,
            messages: [
              {
                role: "system",
                content: `Generate exactly 6-8 multiple-choice quiz questions in JSON format.
Each object must include:
{
  "question": "Clear question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": "Option A"
}

IMPORTANT:
- Return ONLY a valid JSON array
- No markdown, no code blocks, no explanations
- Each question should have exactly 4 options
- The answer should be one of the options (exact match)
- Start response with [ and end with ]`,
              },
              { role: "user", content: fileContent },
            ],
          });
        }, 3);

        // Validate quiz structure
        const validQuiz = quiz.filter(q => 
          q && typeof q === 'object' && 
          typeof q.question === 'string' && q.question.trim() &&
          Array.isArray(q.options) && q.options.length === 4 &&
          typeof q.answer === 'string' && q.answer.trim() &&
          q.options.includes(q.answer)
        );

        if (validQuiz.length === 0) {
          throw new Error("No valid quiz questions found in response");
        }

        console.log(`Generated ${validQuiz.length} valid quiz questions`);
        
        generatedContentData = validQuiz;
        contentTitle = `Quiz from ${req.file.originalname}`;
        result = { quiz: validQuiz };
        break;

      case 'summary':
        const summaryCompletion = await withRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: 512,
            messages: [
              {
                role: "system",
                content: `You are tasked with creating a summary of the provided content. 
                Create a concise and informative summary that:
                - Is 150-200 words long
                - Focuses on the main topics and key points
                - Uses clear, engaging prose
                - Does not use markdown, code formatting, or bullet points
                - Provides value to someone who hasn't read the original content
                
                The user will provide the content for you to summarize.`,
              },
              { role: "user", content: `Please summarize this content:\n\n${fileContent}` },
            ],
          });
        }, 3);
        
        let summary = summaryCompletion.choices[0].message.content;
        summary = summary.replace(/```(json|text)?/g, "").trim();
        
        // Remove any potential prefixes like "Summary:" or "Content Summary:"
        summary = summary.replace(/^(summary|content summary):\s*/i, "");
        
        generatedContentData = summary;
        contentTitle = `Summary from ${req.file.originalname}`;
        result = { summary: generatedContentData };
        break;

      default:
        return res.status(400).json({ error: "Invalid content type" });
    }

    // Save generated content to MongoDB
    const savedContent = await saveUserContent(userId, contentTitle, type, fileContent, generatedContentData);

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
      
      // Add bullet points as single text element with proper line spacing
      const bulletPoints = slide.points.map((point, pointIndex) => {
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

module.exports = router;
