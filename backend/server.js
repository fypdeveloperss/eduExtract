const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const { YoutubeTranscript } = require("youtube-transcript");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const apiKey = process.env.AIML_API_KEY;
const modelUrl = "https://api.aimlapi.com/v1/chat/completions";

app.post("/blog", async (req, res) => {
  const { url } = req.body;

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    // Fetch transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map(item => item.text).join(" ");

    // Send transcript to AI API with improved prompt
    const aiResponse = await axios.post(
      modelUrl,
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional content writer. Based on the following YouTube transcript, generate a detailed and well-structured blog post of at least 1000 words in valid HTML format.

Guidelines:
- Begin with a compelling <h1> title that reflects the main topic.
- Use <h2> tags for main sections and <h3> tags for sub-sections where appropriate.
- Organize the content into clear sections with logical flow and transitions.
- Write in a professional, engaging, and informative tone suited for blog readers.
- Use <p> tags for paragraphs and include <ul><li> lists for key points or summaries when relevant.
- Highlight key ideas with <b> for bold and <i> for italics, only where it improves readability or emphasis.
- Ensure the HTML is clean and minimal—no inline styles, CSS, or JavaScript.
- Do not include any code blocks or markdown syntax.

Make sure the blog:
- Includes an introduction, main content body, and a conclusion or takeaway.
- Reflects the core message and tone of the transcript accurately.
- Is suitable for publishing directly on a blog platform.`
          },
          { role: "user", content: transcriptText }
        ]
      },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } }
    );

    let formattedBlog = aiResponse.data.choices[0].message.content;

    // Remove unwanted markdown formatting (if it appears)
    formattedBlog = formattedBlog.replace(/```html/g, "").replace(/```/g, "");

    res.json({ blogPost: formattedBlog });
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Error processing the request" });
  }
});

app.post("/summary", async (req, res) => {
  const { url } = req.body;

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    // Fetch transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map(item => item.text).join(" ");

    // Send transcript to AI API with summary prompt
    const aiResponse = await axios.post(
      modelUrl,
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant. Based on the transcript provided, write a concise, accurate, and informative summary (150–300 words). 
- Do not include any HTML or markdown.
- Focus on the main points, ideas, and takeaways.
- Keep it easy to understand for a general audience.`
          },
          { role: "user", content: transcriptText }
        ]
      },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } }
    );

    const summary = aiResponse.data.choices[0].message.content.trim();

    res.json({ summary });
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Error processing the summary" });
  }
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
