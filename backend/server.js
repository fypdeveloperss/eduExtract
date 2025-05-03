const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { YoutubeTranscript } = require("youtube-transcript");
const { Groq } = require("groq-sdk");
const PptxGenJS = require("pptxgenjs");
const NodeCache = require("node-cache");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const transcriptCache = new NodeCache({ stdTTL: 600 }); // 600 seconds = 10 minutes


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

    const blogPost = completion.choices[0].message.content.replace(/```html|```/g, "");
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

    const content = completion.choices[0].message.content.replace(/```json|```/g, "");
    const flashcards = JSON.parse(content);
    res.json({ flashcards });
  } catch (error) {
    console.error("Flashcard error:", error.message);
    res.status(500).json({ error: "Failed to generate flashcards" });
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

      if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
        throw new Error("JSON array not found in response");
      }

      const jsonArrayString = responseContent.substring(firstBracket, lastBracket + 1);
      slides = JSON.parse(jsonArrayString);

      if (!Array.isArray(slides)) {
        throw new Error("Parsed JSON is not an array");
      }
    } catch (jsonErr) {
      console.error("Invalid JSON response from AI model:", jsonErr.message);
      return res.status(500).json({ error: "AI response was not valid JSON. Please try again." });
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
    res.setHeader("Content-Disposition", 'attachment; filename="presentation.pptx"');
    res.json({
      pptxBase64: b64,
      slides,
      success: true,
    });
  } catch (error) {
    console.error("Error generating .pptx:", error.response?.data || error.message);
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

    const quiz = JSON.parse(completion.choices[0].message.content.replace(/```json|```/g, ""));
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
    console.error("Summary generation error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

app.post("/chatbot", async (req, res) => {
  const { url, question } = req.body;

  try {
    if (!url || !question) {
      return res.status(400).json({ error: "Missing YouTube URL or question" });
    }

    const transcriptText = await getTranscriptText(url);

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.7,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are a helpful educational assistant. Answer questions based only on the transcript below. If needed, suggest additional trusted sources.`,
        },
        {
          role: "user",
          content: `Transcript:\n${transcriptText}`,
        },
        {
          role: "user",
          content: `Question: ${question}`,
        },
      ],
    });

    const answer = completion.choices[0].message.content.trim();
    res.json({ answer });

  } catch (error) {
    console.error("Chatbot error:", error.message);
    res.status(500).json({ error: "Failed to generate chatbot response" });
  }
});


// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
