const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { exec } = require("child_process"); // Import exec from child_process
const { Groq } = require("groq-sdk");
const PptxGenJS = require("pptxgenjs");
const NodeCache = require("node-cache");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");
const { verifyToken } = require('./config/firebase-admin');
const mongoose = require('mongoose'); // Import mongoose

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eduExtract'; // MongoDB connection URI

app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define a schema and model for generated content
const contentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true }, // e.g., 'blog', 'flashcards', 'slides', 'quiz', 'summary'
  title: { type: String, required: true }, // A title for the generated content
  createdAt: { type: Date, default: Date.now },
  contentData: { type: mongoose.Schema.Types.Mixed, required: true }, // Store the actual generated content
  url: { type: String }, // Original YouTube URL if applicable
  filePath: { type: String } // Original file path if applicable
});

const GeneratedContent = mongoose.model('GeneratedContent', contentSchema);


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

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, TXT, and PPTX files are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

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
app.post("/generate-blog", verifyToken, async (req, res) => {
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
app.post("/generate-flashcards", verifyToken, async (req, res) => {
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
      title: `Flashcards from ${req.body.url}`, // You might want a more descriptive title
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
app.post("/generate-slides", verifyToken, async (req, res) => {
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
      title: `Slides from ${url}`, // You might want a more descriptive title
      contentData: validSlides, // Storing the slide array, not the base64 PPTX
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
app.post("/generate-quiz", verifyToken, async (req, res) => {
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
      title: `Quiz from ${req.body.url}`, // You might want a more descriptive title
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
app.post("/generate-summary", verifyToken, async (req, res) => {
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
      title: `Summary from ${url}`, // You might want a more descriptive title
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
app.post("/api/chat", verifyToken, async (req, res) => {
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

// Helper function to extract text from uploaded files
async function extractTextFromFile(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (mimeType === 'text/plain') {
      return fs.readFileSync(filePath, 'utf8');
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      throw new Error('PPTX text extraction not implemented yet');
    }
    throw new Error('Unsupported file type');
  } catch (error) {
    console.error('Text extraction error:', error);
    throw error;
  }
}

// Clean up uploaded files
function cleanupFile(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
}

/**
 * FILE PROCESSING ENDPOINT
 */
app.post("/process-file", verifyToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  const contentType = req.body.type;
  const userId = req.user.uid;

  try {
    const fileContent = await extractTextFromFile(filePath, req.file.mimetype);
    console.log(`Processing file for ${contentType} generation`);

    let result;
    let generatedContentData;
    let contentTitle = `Content from file: ${req.file.originalname}`; // Default title

    switch (contentType) {
      case 'blog':
        const blogCompletion = await withRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: 2048,
            messages: [
              {
                role: "system",
                content: `Generate a professional, well-structured HTML blog post (2000+ words) based on the file content.
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
        generatedContentData = blogCompletion.choices[0].message.content.replace(/```html|```/g, "");
        const blogTitleMatch = generatedContentData.match(/<h1[^>]*>(.*?)<\/h1>/i);
        contentTitle = blogTitleMatch ? blogTitleMatch[1].trim() : `Blog Post from ${req.file.originalname}`;
        result = { blog: generatedContentData };
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
                content: `Generate 6-10 presentation slides based on the content.
                Return a JSON array where each object has:
                {
                  "title": "Slide title",
                  "content": ["Bullet point 1", "Bullet point 2", ...]
                }
                
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

        // Generate PPTX
        const pptx = new PptxGenJS();
        slides.forEach(slide => {
          const pptxSlide = pptx.addSlide();
          pptxSlide.addText(slide.title, { x: 0.5, y: 0.5, w: '90%', h: 1, fontSize: 24, bold: true });
          slide.content.forEach((point, idx) => {
            pptxSlide.addText(point, { x: 0.5, y: 1.7 + (idx * 0.5), w: '90%', h: 0.5, fontSize: 18, bullet: true });
          });
        });

        const pptxBuffer = await pptx.write('base64');
        result = { 
          pptxBase64: pptxBuffer,
          slides: slides
        };
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
                content: `Generate 5-8 educational flashcards as a JSON array.
                Each flashcard should have a "question" and an "answer" field.
                
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

      case 'quiz':
        const quiz = await parseAIResponseWithRetry(async () => {
          return await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: 1200,
            messages: [
              {
                role: "system",
                content: `Generate a quiz with 6-8 multiple choice questions based on the content.
                Return a JSON array where each object has:
                {
                  "question": "Question text",
                  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                  "correctAnswer": "A"
                }
                
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
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: 512,
            messages: [
              {
                role: "system",
                content: "Generate a concise but comprehensive summary of the content in about 500 words. Do not use markdown or code formatting.",
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

    // Save generated content to MongoDB for file uploads
    const newContent = new GeneratedContent({
      userId,
      type: contentType,
      title: contentTitle,
      contentData: generatedContentData,
      filePath: req.file.path // Store the path to the original uploaded file
    });
    await newContent.save();
    console.log(`Saved new content from file (ID: ${newContent._id}) to database.`);
    
    // Add contentId to the response for client-side routing
    result.contentId = newContent._id;

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

/**
 * GET USER GENERATED CONTENT
 */
app.get("/api/content/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    // Ensure the requesting user matches the userId in the URL or is an admin (if applicable)
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: "Unauthorized access to content" });
    }

    const content = await GeneratedContent.find({ userId }).sort({ createdAt: -1 });
    res.json(content);
  } catch (error) {
    console.error("Error fetching user content:", error.message);
    res.status(500).json({ error: "Failed to fetch user content" });
  }
});

/**
 * GET SINGLE GENERATED CONTENT BY ID
 */
app.get("/api/content/details/:contentId", verifyToken, async (req, res) => {
  try {
    const { contentId } = req.params;
    const content = await GeneratedContent.findById(contentId);

    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }
    
    // Ensure the requesting user owns the content
    if (req.user.uid !== content.userId) {
      return res.status(403).json({ error: "Unauthorized access to this content" });
    }

    res.json(content);
  } catch (error) {
    console.error("Error fetching single content:", error.message);
    res.status(500).json({ error: "Failed to fetch content details" });
  }
});


// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
