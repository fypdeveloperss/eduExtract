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
const authRoutes = require('./routes/auth');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const transcriptCache = new NodeCache({ stdTTL: 600 }); // 600 seconds = 10 minutes

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

// Auth routes
app.use('/api/auth', authRoutes);

/**
 * BLOG GENERATION
 */
app.post("/generate-blog", async (req, res) => {
  try {
    const transcriptText = await getTranscriptText(req.body.url);

    const completion = await groq.chat.completions.create({
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
app.post("/generate-flashcards", async (req, res) => {
  try {
    const transcriptText = await getTranscriptText(req.body.url);

    const completion = await groq.chat.completions.create({
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
      const retryCompletion = await groq.chat.completions.create({
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
app.post("/generate-slides", async (req, res) => {
  const { url } = req.body;

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map((item) => item.text).join(" ");

    const chatCompletion = await groq.chat.completions.create({
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
app.post("/generate-quiz", async (req, res) => {
  try {
    const transcriptText = await getTranscriptText(req.body.url);

    const completion = await groq.chat.completions.create({
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
app.post("/generate-summary", async (req, res) => {
  const { url } = req.body;

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map((item) => item.text).join(" ");

    const chatCompletion = await groq.chat.completions.create({
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
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const systemPrompt = {
      role: "system",
      content: "You are a helpful educational assistant for EduExtract. Only answer questions related to education and this app."
    };

    const finalMessages = [systemPrompt, ...messages];

    const completion = await groq.chat.completions.create({
      messages: finalMessages,
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 1024,
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

// Helper function to extract text from different file types
async function extractTextFromFile(file) {
  const filePath = file.path;
  const fileType = file.mimetype;

  try {
    let text = '';

    if (fileType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else if (fileType === 'text/plain') {
      text = fs.readFileSync(filePath, 'utf8');
    }

    // Clean up the uploaded file
    fs.unlinkSync(filePath);
    return text;
  } catch (error) {
    // Clean up the file in case of error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
}

/**
 * FILE UPLOAD AND PROCESSING
 */
app.post("/process-file", upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const text = await extractTextFromFile(req.file);

    // Generate all content types in parallel
    const [blogResult, flashcardsResult, slidesResult, quizResult, summaryResult] = await Promise.all([
      // Generate blog
      groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 1,
        max_tokens: 2048,
        messages: [
          {
            role: "system",
            content: `Generate a professional, well-structured HTML blog post (2000+ words) based on the content.
            - Use <h1> for title, <h2> for sections, <h3> for sub-sections.
            - Include an engaging introduction and a thoughtful conclusion.
            - Use <p> for paragraphs, <ul><li> for lists, and emphasize key points with <b> or <i>.
            - Return only valid HTML without CSS or markdown.`,
          },
          { role: "user", content: text },
        ],
      }),

      // Generate flashcards
      groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: `Generate 5-10 educational flashcards as a JSON array.
Each flashcard should have a "question" and an "answer" field.
Return only valid JSON. No markdown or explanations.`,
          },
          { role: "user", content: text },
        ],
      }),

      // Generate slides
      groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 1,
        max_tokens: 2048,
        messages: [
          {
            role: "system",
            content: `Create 8-12 slide titles and their bullet points based on this content. 
Return valid JSON like: [{"title": "Slide Title", "points": ["Point 1", "Point 2"]}, ...]
No markdown or triple backticks. Only pure JSON.`,
          },
          { role: "user", content: text },
        ],
      }),

      // Generate quiz
      groq.chat.completions.create({
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
          { role: "user", content: text },
        ],
      }),

      // Generate summary
      groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: 512,
        messages: [
          {
            role: "system",
            content: `Summarize the content into a concise and informative paragraph. Limit to 150-200 words.`,
          },
          { role: "user", content: text },
        ],
      })
    ]);

    // Process results
    const blogPost = blogResult.choices[0].message.content.replace(/```html|```/g, "");
    
    let flashcards;
    try {
      const flashcardsContent = flashcardsResult.choices[0].message.content.replace(/```json|```/g, "").trim();
      const firstBracket = flashcardsContent.indexOf("[");
      const lastBracket = flashcardsContent.lastIndexOf("]");
      const jsonArrayString = flashcardsContent.substring(firstBracket, lastBracket + 1);
      flashcards = JSON.parse(jsonArrayString);
    } catch (error) {
      console.error("Error parsing flashcards:", error);
      flashcards = [];
    }

    let slides;
    try {
      const slidesContent = slidesResult.choices[0].message.content.replace(/```json|```/g, "").trim();
      const firstBracket = slidesContent.indexOf("[");
      const lastBracket = slidesContent.lastIndexOf("]");
      const jsonArrayString = slidesContent.substring(firstBracket, lastBracket + 1);
      slides = JSON.parse(jsonArrayString);
    } catch (error) {
      console.error("Error parsing slides:", error);
      slides = [];
    }

    let quiz;
    try {
      const quizContent = quizResult.choices[0].message.content.replace(/```json|```/g, "").trim();
      quiz = JSON.parse(quizContent);
    } catch (error) {
      console.error("Error parsing quiz:", error);
      quiz = [];
    }

    const summary = summaryResult.choices[0].message.content.replace(/```(json|text)?/g, "").trim();

    // Generate PowerPoint if slides were successfully created
    let pptxBase64 = '';
    if (slides && slides.length > 0) {
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
      pptxBase64 = await pptx.write("base64");
    }

    res.json({
      blog: blogPost,
      flashcards,
      slides,
      pptxBase64,
      quiz,
      summary
    });

  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ 
      error: "Failed to process file",
      details: error.message 
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
