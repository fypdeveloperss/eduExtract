const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { YoutubeTranscript } = require("youtube-transcript");
const { Groq } = require("groq-sdk");
const PptxGenJS = require("pptxgenjs");
const NodeCache = require("node-cache");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");
const { verifyToken } = require('./config/firebase-admin');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const transcriptCache = new NodeCache({ stdTTL: 600 }); // 600 seconds = 10 minutes

// Retry utility function
async function withRetry(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed:`, error.message);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  throw lastError;
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

// Helper: Extract transcript text from YouTube URL
async function getTranscriptText(url) {
  const videoId = new URL(url).searchParams.get("v");
  if (!videoId) throw new Error("Invalid YouTube URL");

  const cacheKey = `transcript:${videoId}`;
  const cached = transcriptCache.get(cacheKey);
  if (cached) return cached;

  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  const fullText = transcript.map((item) => item.text).join(" ");
  transcriptCache.set(cacheKey, fullText); // Auto-expires after 10 mins
  return fullText;
}

/**
 * BLOG GENERATION
 */
app.post("/generate-blog", verifyToken, async (req, res) => {
  try {
    const transcriptText = await getTranscriptText(req.body.url);

    const completion = await withRetry(async () => {
      const result = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 1,
        max_tokens: 2048,
        messages: [
          {
            role: "system",
            content: `Generate a professional, well-structured HTML blog post (2000+ words) based on the transcript.
            - Use <h1> for title, <h2> for sections, <h3> for sub-sections.
            - Include an engaging introduction and a thoughtful conclusion.
            - Use <p> for paragraphs, <ul><li> for lists, and emphasize key points with <b> or <i>.
            - Return only valid HTML without CSS or markdown.`,
          },
          { role: "user", content: transcriptText },
        ],
      });

      if (!result.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response format");
      }

      return result;
    });

    const blogPost = completion.choices[0].message.content.replace(
      /```html|```/g,
      ""
    );
    res.json({ blogPost });
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

    const completion = await withRetry(async () => {
      const result = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: `Generate 5-10 educational flashcards as a JSON array.
Each flashcard should have a "question" and an "answer" field.
Return only valid JSON. No markdown or explanations.`,
          },
          { role: "user", content: transcriptText },
        ],
      });

      if (!result.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response format");
      }

      return result;
    });

    let content = completion.choices[0].message.content.replace(/```json|```/g, "").trim();
    
    // Try to find and extract JSON array from the response
    try {
      const firstBracket = content.indexOf("[");
      const lastBracket = content.lastIndexOf("]");
      
      if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
        throw new Error("JSON array not found in response");
      }
      
      const jsonArrayString = content.substring(firstBracket, lastBracket + 1);
      const flashcards = JSON.parse(jsonArrayString);
      
      if (!Array.isArray(flashcards)) {
        throw new Error("Parsed JSON is not an array");
      }
      
      // Validate each flashcard has required fields
      const validFlashcards = flashcards.filter(card => 
        card && typeof card === 'object' && 
        typeof card.question === 'string' && 
        typeof card.answer === 'string'
      );
      
      if (validFlashcards.length === 0) {
        throw new Error("No valid flashcards found in response");
      }
      
      res.json({ flashcards: validFlashcards });
    } catch (jsonErr) {
      console.error("Invalid JSON response from AI model:", jsonErr.message);
      // Retry with a more strict prompt
      const retryCompletion = await withRetry(async () => {
        const result = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "system",
              content: `Generate exactly 5 educational flashcards as a JSON array.
Each flashcard must have exactly these fields:
{
  "question": "string",
  "answer": "string"
}
Return ONLY the JSON array, nothing else. No markdown, no explanations.`,
            },
            { role: "user", content: transcriptText },
          ],
        });

        if (!result.choices?.[0]?.message?.content) {
          throw new Error("Invalid AI response format");
        }

        return result;
      });
      
      const retryContent = retryCompletion.choices[0].message.content.replace(/```json|```/g, "").trim();
      const flashcards = JSON.parse(retryContent);
      
      if (!Array.isArray(flashcards)) {
        throw new Error("Failed to generate valid flashcards after retry");
      }
      
      res.json({ flashcards });
    }
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

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map((item) => item.text).join(" ");

    const chatCompletion = await withRetry(async () => {
      const result = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 1,
        max_tokens: 2048,
        top_p: 1,
        stream: false,
        messages: [
          {
            role: "system",
            content: `Create 8-12 slide titles and their bullet points based on this transcript. 
Return valid JSON like: [{"title": "Slide Title", "points": ["Point 1", "Point 2"]}, ...]
No markdown or triple backticks. Only pure JSON.`,
          },
          {
            role: "user",
            content: transcriptText,
          },
        ],
      });

      if (!result.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response format");
      }

      return result;
    });

    // Extract and clean content
    let responseContent = chatCompletion.choices[0]?.message?.content || "";
    responseContent = responseContent.trim().replace(/```json|```/g, "");

    // Validate JSON format
    let slides;
    try {
      // Ensure it's a JSON array before parsing
      const firstBracket = responseContent.indexOf("[");
      const lastBracket = responseContent.lastIndexOf("]");

      if (
        firstBracket === -1 ||
        lastBracket === -1 ||
        lastBracket <= firstBracket
      ) {
        throw new Error("JSON array not found in response");
      }

      const jsonArrayString = responseContent.substring(
        firstBracket,
        lastBracket + 1
      );
      slides = JSON.parse(jsonArrayString);

      if (!Array.isArray(slides)) {
        throw new Error("Parsed JSON is not an array");
      }
    } catch (jsonErr) {
      console.error("Invalid JSON response from AI model:", jsonErr.message);
      return res
        .status(500)
        .json({ error: "AI response was not valid JSON. Please try again." });
    }

    // Generate PowerPoint
    const pptx = new PptxGenJS();
    slides.forEach((slide) => {
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
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="presentation.pptx"'
    );
    res.json({
      pptxBase64: b64,
      slides,
      success: true,
    });
  } catch (error) {
    console.error(
      "Error generating .pptx:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to generate PowerPoint file" });
  }
});

/**
 * QUIZ GENERATION
 */
app.post("/generate-quiz", verifyToken, async (req, res) => {
  try {
    const transcriptText = await getTranscriptText(req.body.url);

    const completion = await withRetry(async () => {
      const result = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: `Generate 5-10 multiple-choice quiz questions in JSON format.
Each object must include:
- "question"
- "options" (array of 4 choices)
- "answer" (correct choice)
Return only valid JSON. No markdown or explanations.`,
          },
          { role: "user", content: transcriptText },
        ],
      });

      if (!result.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response format");
      }

      return result;
    });

    const quiz = JSON.parse(
      completion.choices[0].message.content.replace(/```json|```/g, "")
    );
    res.json({ quiz });
  } catch (error) {
    console.error("Quiz error:", error.message);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});

/**
 * SUMMARY GENERATION ✅ (NEW ENDPOINT)
 */
app.post("/generate-summary", verifyToken, async (req, res) => {
  const { url } = req.body;

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map((item) => item.text).join(" ");

    const chatCompletion = await withRetry(async () => {
      const result = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: 512,
        top_p: 1,
        stream: false,
        messages: [
          {
            role: "system",
            content: `Summarize the transcript into a concise and informative paragraph. Limit to 150-200 words.`,
          },
          {
            role: "user",
            content: transcriptText,
          },
        ],
      });

      if (!result.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response format");
      }

      return result;
    });

    let summary = chatCompletion.choices[0].message.content;
    summary = summary.replace(/```(json|text)?/g, "").trim();

    res.json({ summary });
  } catch (error) {
    console.error(
      "Summary generation error:",
      error.response?.data || error.message
    );
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
    });

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
      // For PPTX files, we might need a different library or approach
      // For now, we'll return an error
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

  try {
    const fileContent = await extractTextFromFile(filePath, req.file.mimetype);

    let completion;
    switch (contentType) {
      case 'blog':
        completion = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 1,
          max_tokens: 2048,
          messages: [
            {
              role: "system",
              content: `Generate a professional, well-structured HTML blog post (2000+ words) based on the file content.
              - Use <h1> for title, <h2> for sections, <h3> for sub-sections.
              - Include an engaging introduction and a thoughtful conclusion.
              - Use <p> for paragraphs, <ul><li> for lists, and emphasize key points with <b> or <i>.
              - Return only valid HTML without CSS or markdown.`,
            },
            { role: "user", content: fileContent },
          ],
        });
        res.json({ blog: completion.choices[0].message.content.replace(/```html|```/g, "") });
        break;

      case 'slides':
        completion = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "system",
              content: `Generate 5-10 presentation slides based on the content.
              Return a JSON array where each object represents a slide with:
              {
                "title": "Slide title",
                "content": ["Bullet point 1", "Bullet point 2", ...]
              }`,
            },
            { role: "user", content: fileContent },
          ],
        });
        
        const slides = JSON.parse(completion.choices[0].message.content.replace(/```json|```/g, ""));
        
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
        res.json({ 
          pptxBase64: pptxBuffer,
          slides: slides
        });
        break;

      case 'flashcards':
        completion = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "system",
              content: `Generate 5-10 educational flashcards as a JSON array.
              Each flashcard should have a "question" and an "answer" field.
              Return only valid JSON. No markdown or explanations.`,
            },
            { role: "user", content: fileContent },
          ],
        });
        
        const flashcards = JSON.parse(completion.choices[0].message.content.replace(/```json|```/g, ""));
        res.json({ flashcards });
        break;

      case 'quiz':
        completion = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "system",
              content: `Generate a quiz with 5-10 multiple choice questions based on the content.
              Return a JSON array where each object has:
              {
                "question": "Question text",
                "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                "correctAnswer": "A" // Just the letter
              }`,
            },
            { role: "user", content: fileContent },
          ],
        });
        
        const quiz = JSON.parse(completion.choices[0].message.content.replace(/```json|```/g, ""));
        res.json({ quiz });
        break;

      case 'summary':
        completion = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "system",
              content: "Generate a concise but comprehensive summary of the content in about 500 words.",
            },
            { role: "user", content: fileContent },
          ],
        });
        
        res.json({ summary: completion.choices[0].message.content });
        break;

      default:
        res.status(400).json({ error: "Invalid content type" });
    }
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

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
