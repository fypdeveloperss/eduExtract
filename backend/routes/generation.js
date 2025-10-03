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

// Initialize services
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const transcriptCache = new NodeCache({ stdTTL: 600 }); // 600 seconds = 10 minutes

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

// Helper function to create or update user
async function createOrUpdateUser(uid, name, email) {
  try {
    let user = await User.findOne({ uid });
    
    if (user) {
      // Update existing user
      user.name = name;
      user.email = email;
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Create new user
      user = new User({
        uid,
        name,
        email
      });
      await user.save();
    }
    
    return user;
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
}

/**
 * BLOG GENERATION
 */
router.post("/generate-blog", verifyToken, async (req, res) => {
  try {
    const transcriptText = await getTranscriptText(req.body.url);
    const userId = req.user.uid; // Get userId from verified token

    // Create or update user record
    await createOrUpdateUser(userId, req.user.name || 'Unknown User', req.user.email || 'unknown@example.com');

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

    // Create or update user record
    await createOrUpdateUser(userId, req.user.name || 'Unknown User', req.user.email || 'unknown@example.com');

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

    // Create or update user record
    await createOrUpdateUser(userId, req.user.name || 'Unknown User', req.user.email || 'unknown@example.com');

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

    // Generate PowerPoint
    const pptx = new PptxGenJS();
    validSlides.forEach((slide) => {
      const s = pptx.addSlide();
      s.addText(slide.title, { x: 0.5, y: 0.3, fontSize: 24, bold: true });
      s.addText(slide.points.join("\n"), {
        x: 0.5,
        y: 1.2,
        fontSize: 18,
        color: "363636",
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

    // Create or update user record
    await createOrUpdateUser(userId, req.user.name || 'Unknown User', req.user.email || 'unknown@example.com');

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

    // Create or update user record
    await createOrUpdateUser(userId, req.user.name || 'Unknown User', req.user.email || 'unknown@example.com');

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
 * CHATBOT ENDPOINT
 */
router.post("/api/chat", verifyToken, async (req, res) => {
  try {
    const { messages } = req.body;

    const systemPrompt = {
      role: "system",
      content: "You are a helpful educational assistant for EduExtract. Only answer questions related to education and this app."
    };

    const finalMessages = [systemPrompt, ...messages];

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
    res.json({ message: aiResponse });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to get response from AI" });
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
        
        // Generate PowerPoint
        const pptx = new PptxGenJS();
        validSlides.forEach((slide) => {
          const s = pptx.addSlide();
          s.addText(slide.title, { x: 0.5, y: 0.3, fontSize: 24, bold: true });
          s.addText(slide.points.join("\n"), {
            x: 0.5,
            y: 1.2,
            fontSize: 18,
            color: "363636",
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

module.exports = router;
