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

    const content = completion.choices[0].message.content.trim();
    console.log("Raw AI response:", content.substring(0, 200) + "...");

    // Try to find JSON in the response
    const jsonMatch = content.match(/\\[.*\\]/s);
    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }

    const jsonString = jsonMatch[0];
    console.log("Extracted JSON string:", jsonString.substring(0, 100) + "...");
    
    try {
      const parsedJson = JSON.parse(jsonString);
      if (!Array.isArray(parsedJson)) {
        throw new Error("Parsed content is not an array");
      }
      console.log(`Successfully parsed JSON array with ${parsedJson.length} items`);
      return parsedJson;
    } catch (parseError) {
      console.log("JSON parse error:", parseError.message);
      throw new Error(`JSON parsing failed: ${parseError.message}`);
    }
  }, maxRetries);
}

// Utility function to save user content
async function saveUserContent(userId, title, type, originalContent, generatedContent) {
  try {
    const newContent = new GeneratedContent({
      userId,
      type,
      title,
      originalContent,
      contentData: generatedContent
    });
    await newContent.save();
    console.log(`Saved new content (ID: ${newContent._id}) to database.`);
    return newContent;
  } catch (error) {
    console.error('Error saving content:', error);
    throw error;
  }
}

// Utility function for file cleanup
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

// Blog generation endpoint
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
        model: "meta-llama/llama-3.1-70b-versatile",
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

// Flashcards generation endpoint
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
        model: "meta-llama/llama-3.1-70b-versatile",
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

// Slides generation endpoint
router.post("/generate-slides", verifyToken, async (req, res) => {
  try {
    const { text, title } = req.body;
    const userId = req.user.uid;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text content is required" });
    }

    console.log("Generating slides...");

    const slides = await parseAIResponseWithRetry(async () => {
      return await groq.chat.completions.create({
        model: "meta-llama/llama-3.1-70b-versatile",
        temperature: 0.7,
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: `Create presentation slides from the provided content. Each slide should have a clear title and bullet points or short paragraphs.

            Return your response as a JSON array of objects, where each object has:
            - "title": Slide title
            - "content": Array of key points or short paragraphs for the slide
            
            Create 5-10 slides that cover the main topics comprehensively.
            
            IMPORTANT:
            - Return ONLY a valid JSON array
            - No markdown, no code blocks, no explanations
            - Start response with [ and end with ]`,
          },
          { role: "user", content: text },
        ],
      });
    }, 3);

    // Save generated content to MongoDB
    const savedContent = await saveUserContent(userId, title || 'Generated Slides', 'slides', text, slides);

    console.log("Slides generated successfully");

    // Generate PowerPoint file
    try {
      const pres = new PptxGenJS();
      
      slides.forEach((slide, index) => {
        const pptSlide = pres.addSlide();
        
        // Add title
        pptSlide.addText(slide.title, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 1,
          fontSize: 24,
          bold: true,
          color: "2F4F4F"
        });
        
        // Add content
        const contentText = Array.isArray(slide.content) 
          ? slide.content.join('\\n\\n') 
          : slide.content;
          
        pptSlide.addText(contentText, {
          x: 0.5,
          y: 2,
          w: 9,
          h: 5,
          fontSize: 16,
          color: "000000"
        });
      });

      const fileName = `slides_${Date.now()}.pptx`;
      const filePath = path.join(__dirname, '..', 'uploads', fileName);
      
      // Ensure uploads directory exists
      const uploadsDir = path.dirname(filePath);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      await pres.writeFile({ fileName: filePath });
      
      res.json({ 
        slides, 
        contentId: savedContent._id,
        downloadUrl: `/download/${fileName}`
      });
    } catch (pptxError) {
      console.error("PowerPoint generation error:", pptxError);
      // Still return slides even if PPTX generation fails
      res.json({ 
        slides, 
        contentId: savedContent._id,
        message: "Slides generated but PowerPoint file creation failed"
      });
    }
  } catch (error) {
    console.error("Slides generation error:", error);
    res.status(500).json({ 
      error: "Failed to generate slides",
      details: error.message 
    });
  }
});

// Quiz generation endpoint
router.post("/generate-quiz", verifyToken, async (req, res) => {
  try {
    const { text, title } = req.body;
    const userId = req.user.uid;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text content is required" });
    }

    console.log("Generating quiz...");

    const quiz = await parseAIResponseWithRetry(async () => {
      return await groq.chat.completions.create({
        model: "meta-llama/llama-3.1-70b-versatile",
        temperature: 0.7,
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: `Create a comprehensive quiz from the provided content. Each question should test understanding of key concepts.

            Return your response as a JSON array of objects, where each object has:
            - "question": The quiz question
            - "options": Array of 4 possible answers (A, B, C, D)
            - "correct": The letter of the correct answer (A, B, C, or D)
            - "explanation": Brief explanation of why the answer is correct
            
            Create 5-10 questions that thoroughly test the material.
            
            IMPORTANT:
            - Return ONLY a valid JSON array
            - No markdown, no code blocks, no explanations
            - Start response with [ and end with ]`,
          },
          { role: "user", content: text },
        ],
      });
    }, 3);

    // Save generated content to MongoDB
    const savedContent = await saveUserContent(userId, title || 'Generated Quiz', 'quiz', text, quiz);

    console.log("Quiz generated successfully");
    res.json({ 
      quiz, 
      contentId: savedContent._id 
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    res.status(500).json({ 
      error: "Failed to generate quiz",
      details: error.message 
    });
  }
});

// Summary generation endpoint
router.post("/generate-summary", verifyToken, async (req, res) => {
  try {
    const { text, title } = req.body;
    const userId = req.user.uid;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text content is required" });
    }

    console.log("Generating summary...");

    const summaryCompletion = await withRetry(async () => {
      return await groq.chat.completions.create({
        model: "meta-llama/llama-3.1-70b-versatile",
        temperature: 0.7,
        max_tokens: 512,
        messages: [
          {
            role: "system",
            content: "Generate a concise but comprehensive summary of the content. Capture the main points, key concepts, and important details in about 300-500 words. Write in clear, easy-to-understand language.",
          },
          { role: "user", content: text },
        ],
      });
    }, 3);

    const summaryContent = summaryCompletion.choices[0].message.content;
    
    // Save generated content to MongoDB
    const savedContent = await saveUserContent(userId, title || 'Generated Summary', 'summary', text, summaryContent);

    console.log("Summary generated successfully");
    res.json({ 
      summary: summaryContent, 
      contentId: savedContent._id 
    });
  } catch (error) {
    console.error("Summary generation error:", error);
    res.status(500).json({ 
      error: "Failed to generate summary",
      details: error.message 
    });
  }
});

// Chat endpoint
router.post("/api/chat", verifyToken, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log("Processing chat message...");

    const chatCompletion = await withRetry(async () => {
      const messages = [
        {
          role: "system",
          content: "You are a helpful educational assistant. Provide clear, informative responses to help users learn and understand concepts better."
        }
      ];

      if (context) {
        messages.push({
          role: "system", 
          content: `Context: ${context}`
        });
      }

      messages.push({
        role: "user", 
        content: message
      });

      return await groq.chat.completions.create({
        model: "meta-llama/llama-3.1-70b-versatile",
        temperature: 0.7,
        max_tokens: 512,
        messages
      });
    }, 3);

    const response = chatCompletion.choices[0].message.content;

    console.log("Chat response generated successfully");
    res.json({ response });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ 
      error: "Failed to process chat message",
      details: error.message 
    });
  }
});

// File processing endpoint
router.post("/process-file", verifyToken, upload.single('file'), async (req, res) => {
  const { contentType } = req.body;
  const userId = req.user.uid;
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!contentType) {
      return res.status(400).json({ error: "Content type is required" });
    }

    filePath = req.file.path;
    console.log(`Processing file: ${req.file.originalname} for ${contentType}`);

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
    switch (contentType) {
      case 'blog':
        const blogCompletion = await withRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-3.1-70b-versatile",
            temperature: 0.8,
            max_tokens: 1024,
            messages: [
              {
                role: "system",
                content: "Create an engaging, well-structured blog post based on the provided content. Include a compelling introduction, clear main points, and a strong conclusion. Write in a conversational yet informative tone.",
              },
              { role: "user", content: fileContent },
            ],
          });
        }, 3);
        
        generatedContentData = blogCompletion.choices[0].message.content;
        contentTitle = `Blog from ${req.file.originalname}`;
        result = { blog: generatedContentData };
        break;

      case 'flashcards':
        const flashcards = await parseAIResponseWithRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-3.1-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
            messages: [
              {
                role: "system",
                content: `Create flashcards from the provided content. Each flashcard should have a clear question and a comprehensive answer.

                Return your response as a JSON array of objects, where each object has:
                - "question": A clear, specific question
                - "answer": A detailed but concise answer
                
                IMPORTANT:
                - Return ONLY a valid JSON array
                - No markdown, no code blocks, no explanations
                - Start response with [ and end with ]`,
              },
              { role: "user", content: fileContent },
            ],
          });
        }, 3);
        
        generatedContentData = flashcards;
        contentTitle = `Flashcards from ${req.file.originalname}`;
        result = { flashcards };
        break;

      case 'slides':
        const slides = await parseAIResponseWithRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-3.1-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
            messages: [
              {
                role: "system",
                content: `Create presentation slides from the provided content. Each slide should have a clear title and bullet points.

                Return your response as a JSON array of objects, where each object has:
                - "title": Slide title
                - "content": Array of key points for the slide
                
                IMPORTANT:
                - Return ONLY a valid JSON array
                - No markdown, no code blocks, no explanations
                - Start response with [ and end with ]`,
              },
              { role: "user", content: fileContent },
            ],
          });
        }, 3);
        
        generatedContentData = slides;
        contentTitle = `Slides from ${req.file.originalname}`;
        result = { slides };
        break;

      case 'quiz':
        const quiz = await parseAIResponseWithRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-3.1-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
            messages: [
              {
                role: "system",
                content: `Create a comprehensive quiz from the provided content.

                Return your response as a JSON array of objects, where each object has:
                - "question": The quiz question
                - "options": Array of 4 possible answers
                - "correct": The letter of the correct answer (A, B, C, or D)
                - "explanation": Brief explanation of the correct answer
                
                IMPORTANT:
                - Return ONLY a valid JSON array
                - No markdown, no code blocks, no explanations
                - Start response with [ and end with ]`,
              },
              { role: "user", content: fileContent },
            ],
          });
        }, 3);
        
        generatedContentData = quiz;
        contentTitle = `Quiz from ${req.file.originalname}`;
        result = { quiz };
        break;

      case 'summary':
        const summaryCompletion = await withRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-3.1-70b-versatile",
            temperature: 0.7,
            max_tokens: 512,
            messages: [
              {
                role: "system",
                content: "Generate a concise but comprehensive summary of the content in about 300-500 words.",
              },
              { role: "user", content: fileContent },
            ],
          });
        }, 3);
        
        generatedContentData = summaryCompletion.choices[0].message.content;
        contentTitle = `Summary from ${req.file.originalname}`;
        result = { summary: generatedContentData };
        break;

      default:
        return res.status(400).json({ error: "Invalid content type" });
    }

    // Save generated content to MongoDB
    const savedContent = await saveUserContent(userId, contentTitle, contentType, fileContent, generatedContentData);

    // Add contentId to the response
    result.contentId = savedContent._id;

    console.log(`Successfully processed file for ${contentType}`);
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

module.exports = router;
