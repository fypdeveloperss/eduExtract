const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { YoutubeTranscript } = require("youtube-transcript");
const { Groq } = require("groq-sdk");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * BLOG GENERATION ENDPOINT
 */
app.post("/generate", async (req, res) => {
  const { url } = req.body;

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map(item => item.text).join(" ");

    const chatCompletion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      stream: false,
      messages: [
        {
          role: "system",
          content: `Generate a professional, well-structured HTML blog post (2000+ words) based on the transcript.
          - Use <h1> for title, <h2> for sections, <h3> for sub-sections.
          - Include an engaging introduction and a thoughtful conclusion.
          - Use <p> for paragraphs, <ul><li> for lists, and emphasize key points with <b> or <i>.
          - Return only valid HTML without CSS or markdown.`
        },
        {
          role: "user",
          content: transcriptText
        }
      ]
    });

    let blogPost = chatCompletion.choices[0].message.content;
    blogPost = blogPost.replace(/```html/g, "").replace(/```/g, "");

    res.json({ blogPost });
  } catch (error) {
    console.error("Error generating blog:", error.response?.data || error.message);
    res.status(500).json({ error: "Error generating blog post" });
  }
});

app.post("/generate-flashcards", async (req, res) => {
  const { url } = req.body;

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map(item => item.text).join(" ");

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "system",
          content: `Based on the provided transcript, generate 5-10 educational flashcards as a JSON array.
Each flashcard should have a "question" and an "answer" field.
Only return a JSON array. Do NOT include markdown, explanations, or formatting like triple backticks.`
        },
        {
          role: "user",
          content: transcriptText
        }
      ]
    });

    let content = completion.choices[0].message.content;

    // Remove triple backticks if they sneak in
    content = content.replace(/```json/g, "").replace(/```/g, "");

    const flashcards = JSON.parse(content);
    res.json({ flashcards });
  } catch (error) {
    console.error("Flashcard generation error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate flashcards" });
  }
});


/**
 * SLIDES GENERATION ENDPOINT
 */
app.post("/generate-slides", async (req, res) => {
  const { url } = req.body;

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map(item => item.text).join(" ");

    const chatCompletion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      stream: false,
      messages: [
        {
          role: "system",
          content: `Generate a Reveal.js-compatible presentation in raw HTML.
          - Each slide should be inside a <section>.
          - Use <h2> for slide titles and <p> for content.
          - Add 8-12 slides including a title and a conclusion.
          - Do not include CSS or markdown.
          - Only return raw HTML using <section> tags.`
        },
        {
          role: "user",
          content: transcriptText
        }
      ]
    });

    let slideContent = chatCompletion.choices[0].message.content;


    // Remove code block markers (```html and ```)
    slideContent = slideContent.replace(/```html/g, "").replace(/```/g, "");

    res.json({ slides: slideContent });
  } catch (error) {
    console.error("Error generating slides:", error.response?.data || error.message);
    res.status(500).json({ error: "Error generating presentation slides" });
  }
});

/**
 * QUIZ GENERATION ENDPOINT
 */
app.post("/generate-quiz", async (req, res) => {
  const { url } = req.body;

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map(item => item.text).join(" ");

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      stream: false,
      messages: [
        {
          role: "system",
          content: `Generate 5-10 multiple-choice quiz questions based on the following YouTube transcript.
Return a JSON array where each object has:
- "question": the question string
- "options": an array of 4 answer choices
- "answer": the correct answer string
Do NOT include explanations or formatting like triple backticks. Only return valid JSON.`
        },
        {
          role: "user",
          content: transcriptText
        }
      ]
    });

    let quizContent = completion.choices[0].message.content;

    // Clean up any formatting if present
    quizContent = quizContent.replace(/```json/g, "").replace(/```/g, "");

    const quiz = JSON.parse(quizContent);
    res.json({ quiz });
  } catch (error) {
    console.error("Quiz generation error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});



app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
