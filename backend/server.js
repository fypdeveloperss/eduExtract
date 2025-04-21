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

app.post("/generate", async (req, res) => {
  const { url } = req.body;

  try {
    const videoId = new URL(url).searchParams.get("v");
    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    // Fetch transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const transcriptText = transcript.map(item => item.text).join(" ");

    // Send transcript to AI API
    const aiResponse = await axios.post(
      modelUrl,
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Generate a blog post of at least 1000 words in valid HTML format. 
            - Use <h1> for the title, <h2> for main sections, and <h3> for sub-sections.
            - Structure the content properly using <p> for paragraphs and <ul><li> for lists where needed.
            - Use <b> and <i> for emphasis when necessary.
            - Do not include any CSS styling, only pure HTML.`
          },
          { role: "user", content: transcriptText }
        ]
      },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } }
    );
    

    let formattedBlog = aiResponse.data.choices[0].message.content;

    // Remove unwanted "```html" from AI response (if it appears)
    formattedBlog = formattedBlog.replace(/```html/g, "").replace(/```/g, "");

    res.json({ blogPost: formattedBlog });
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Error processing the request" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
