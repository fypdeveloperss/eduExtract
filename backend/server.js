const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const fs = require("fs");
const { YoutubeTranscript } = require("youtube-transcript");
const PPTXGenJS = require("pptxgenjs");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const apiKey = process.env.AIML_API_KEY;
const modelUrl = "https://api.aimlapi.com/v1/chat/completions";

app.use(express.json());
app.use(cors());

// Ensure presentations folder exists
if (!fs.existsSync("./presentations")) fs.mkdirSync("./presentations");

// 🔁 Helper: Extract video ID
const extractVideoId = (url) => {
  try {
    return new URL(url).searchParams.get("v");
  } catch {
    return null;
  }
};

// 🔁 Helper: Fetch transcript text
const getTranscriptText = async (videoId) => {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  return transcript.map((item) => item.text).join(" ");
};

// 🔁 Helper: Send prompt to AI
const sendToAI = async (systemPrompt, userContent) => {
  const response = await axios.post(
    modelUrl,
    {
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].message.content.trim();
};

// 📄 Blog Endpoint
app.post("/blog", async (req, res) => {
  const videoId = extractVideoId(req.body.url);
  if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

  try {
    const transcriptText = await getTranscriptText(videoId);
    const blogPrompt = `You are a professional content writer. Based on the following YouTube transcript, generate a detailed and well-structured blog post of at least 1000 words in valid HTML format.

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
- Is suitable for publishing directly on a blog platform.`;
    let blog = await sendToAI(blogPrompt, transcriptText);
    blog = blog.replace(/```html|```/g, ""); // Strip markdown if present
    res.json({ blogPost: blog });
  } catch (err) {
    console.error("Blog error:", err.response?.data || err.message);
    res.status(500).json({ error: "Error generating blog" });
  }
});

// ✏️ Summary Endpoint
app.post("/summary", async (req, res) => {
  const videoId = extractVideoId(req.body.url);
  if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

  try {
    const transcriptText = await getTranscriptText(videoId);
    const summaryPrompt = `You are a helpful assistant. Based on the transcript provided, write a concise, accurate, and informative summary (150–300 words). 
- Do not include any HTML or markdown.
- Focus on the main points, ideas, and takeaways.
- Keep it easy to understand for a general audience.`;
    const summary = await sendToAI(summaryPrompt, transcriptText);
    res.json({ summary });
  } catch (err) {
    console.error("Summary error:", err.response?.data || err.message);
    res.status(500).json({ error: "Error generating summary" });
  }
});

// 📊 Presentation Endpoint
app.post("/presentation", async (req, res) => {
  const videoId = extractVideoId(req.body.url);
  if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

  try {
    const transcriptText = await getTranscriptText(videoId);
    const slidePrompt = `You are a professional presentation designer. Based on the transcript provided, break the content into enough slide sections.

Format:
Slide 1:
Title: <title>
Bullets:
- Point 1
- Point 2

Only output the slides in this format. Do not include any explanations, markdown, or HTML.`;
    
    const slidesText = await sendToAI(slidePrompt, transcriptText);

    const pptx = new PPTXGenJS();
    const slides = slidesText.split(/Slide \d+:/).filter(Boolean);

    slides.forEach((slide) => {
      const title = slide.match(/Title:\s*(.+)/)?.[1]?.trim() || "Untitled";
      const bullets = [...slide.matchAll(/-\s*(.+)/g)].map((m) => m[1].trim()).filter(Boolean);

      const s = pptx.addSlide();
    s.addText(title, { x: 0.5, y: 0.3, fontSize: 24, bold: true });

    if (bullets.length > 0) {
        // **FIX:** Convert the array of strings into an array of objects
        const bulletItems = bullets.map(bulletText => ({ text: bulletText }));

        s.addText(bulletItems, { // Pass the array of objects here
            x: 0.5,
            y: 1,
            fontSize: 16,
            bullet: true,       // Apply bullet formatting to the items
            color: "363636",
            // You can add other list-level options here, like spacing
            // lineSpacing: 24 // Example: Adds space between bullet points (in points)
        });
    } else {
        s.addText("No bullet points provided.", {
            x: 0.5,
            y: 1,
            fontSize: 16,
            color: "999999",
        });
    }
    });

    // Ensure the folder exists
    const fs = require("fs");
    const folderPath = "./presentations";
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

    const filePath = `${folderPath}/presentation_${videoId}.pptx`;
    await pptx.writeFile({ fileName: filePath });

    res.download(filePath);
  } catch (err) {
    console.error("Presentation error:", err.response?.data || err.message);
    res.status(500).json({ error: "Error generating presentation" });
  }
});

// 🚀 Server Start
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
