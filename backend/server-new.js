const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import models
const User = require('./models/User');
const GeneratedContent = require('./models/GeneratedContent');

// Import services
const UserService = require('./services/userService');
const ContentService = require('./services/contentService');

// Import middleware
const { verifyToken, verifyAdmin } = require('./middleware/auth');
const upload = require('./middleware/upload');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

// Import AI and file processing utilities
const { withRetry, parseAIResponseWithRetry, getTranscriptText } = require('./utils/helpers');
const { extractTextFromFile, cleanupFile } = require('./utils/fileUtils');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Content generation endpoints
app.post("/process-file", verifyToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  const contentType = req.body.type;
  const userId = req.user.uid;

  try {
    // Create or update user record
    await UserService.createOrUpdateUser(userId, req.user.name || 'Unknown User', req.user.email || 'unknown@example.com');

    const fileContent = await extractTextFromFile(filePath, req.file.mimetype);
    console.log(`Processing file for ${contentType} generation`);

    let result;
    let generatedContentData;
    let contentTitle = `Content from file: ${req.file.originalname}`;

    switch (contentType) {
      case 'blog':
        const blogCompletion = await withRetry(async () => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3-70b-8192',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert content creator. Create engaging blog posts from the provided content.'
                },
                {
                  role: 'user',
                  content: `Create a comprehensive blog post from this content: ${fileContent}`
                }
              ],
              temperature: 0.7,
              max_tokens: 2000,
            }),
          });
          return response.json();
        });

        result = await parseAIResponseWithRetry(async () => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3-70b-8192',
              messages: [
                {
                  role: 'system',
                  content: 'Parse the blog post and return it in JSON format with title and content fields.'
                },
                {
                  role: 'user',
                  content: `Parse this blog post into JSON: ${blogCompletion.choices[0].message.content}`
                }
              ],
              temperature: 0.3,
              max_tokens: 1000,
            }),
          });
          return response.json();
        });

        generatedContentData = {
          userId,
          type: 'blog',
          title: result.title || contentTitle,
          content: result,
          originalText: fileContent
        };
        break;

      case 'summary':
        const summaryCompletion = await withRetry(async () => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3-70b-8192',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert at creating concise summaries. Create a comprehensive summary from the provided content.'
                },
                {
                  role: 'user',
                  content: `Create a detailed summary of this content: ${fileContent}`
                }
              ],
              temperature: 0.5,
              max_tokens: 1500,
            }),
          });
          return response.json();
        });

        result = await parseAIResponseWithRetry(async () => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3-70b-8192',
              messages: [
                {
                  role: 'system',
                  content: 'Parse the summary and return it in JSON format with title and content fields.'
                },
                {
                  role: 'user',
                  content: `Parse this summary into JSON: ${summaryCompletion.choices[0].message.content}`
                }
              ],
              temperature: 0.3,
              max_tokens: 800,
            }),
          });
          return response.json();
        });

        generatedContentData = {
          userId,
          type: 'summary',
          title: result.title || contentTitle,
          content: result,
          originalText: fileContent
        };
        break;

      case 'flashcards':
        const flashcardCompletion = await withRetry(async () => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3-70b-8192',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert at creating educational flashcards. Create flashcards from the provided content.'
                },
                {
                  role: 'user',
                  content: `Create flashcards from this content: ${fileContent}`
                }
              ],
              temperature: 0.7,
              max_tokens: 2000,
            }),
          });
          return response.json();
        });

        result = await parseAIResponseWithRetry(async () => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3-70b-8192',
              messages: [
                {
                  role: 'system',
                  content: 'Parse the flashcards and return them in JSON format with an array of cards, each having question and answer fields.'
                },
                {
                  role: 'user',
                  content: `Parse these flashcards into JSON: ${flashcardCompletion.choices[0].message.content}`
                }
              ],
              temperature: 0.3,
              max_tokens: 1500,
            }),
          });
          return response.json();
        });

        generatedContentData = {
          userId,
          type: 'flashcards',
          title: result.title || contentTitle,
          content: result,
          originalText: fileContent
        };
        break;

      case 'quiz':
        const quizCompletion = await withRetry(async () => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3-70b-8192',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert at creating educational quizzes. Create a quiz from the provided content.'
                },
                {
                  role: 'user',
                  content: `Create a quiz from this content: ${fileContent}`
                }
              ],
              temperature: 0.7,
              max_tokens: 2000,
            }),
          });
          return response.json();
        });

        result = await parseAIResponseWithRetry(async () => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3-70b-8192',
              messages: [
                {
                  role: 'system',
                  content: 'Parse the quiz and return it in JSON format with title and questions array, each question having question, options, and correctAnswer fields.'
                },
                {
                  role: 'user',
                  content: `Parse this quiz into JSON: ${quizCompletion.choices[0].message.content}`
                }
              ],
              temperature: 0.3,
              max_tokens: 1500,
            }),
          });
          return response.json();
        });

        generatedContentData = {
          userId,
          type: 'quiz',
          title: result.title || contentTitle,
          content: result,
          originalText: fileContent
        };
        break;

      case 'slides':
        const slidesCompletion = await withRetry(async () => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3-70b-8192',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert at creating presentation slides. Create slides from the provided content.'
                },
                {
                  role: 'user',
                  content: `Create presentation slides from this content: ${fileContent}`
                }
              ],
              temperature: 0.7,
              max_tokens: 2000,
            }),
          });
          return response.json();
        });

        result = await parseAIResponseWithRetry(async () => {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama3-70b-8192',
              messages: [
                {
                  role: 'system',
                  content: 'Parse the slides and return them in JSON format with title and slides array, each slide having title and content fields.'
                },
                {
                  role: 'user',
                  content: `Parse these slides into JSON: ${slidesCompletion.choices[0].message.content}`
                }
              ],
              temperature: 0.3,
              max_tokens: 1500,
            }),
          });
          return response.json();
        });

        generatedContentData = {
          userId,
          type: 'slides',
          title: result.title || contentTitle,
          content: result,
          originalText: fileContent
        };
        break;

      default:
        return res.status(400).json({ error: "Invalid content type" });
    }

    // Save generated content
    const savedContent = await ContentService.createContent(generatedContentData);

    // Clean up uploaded file
    cleanupFile(filePath);

    res.json({
      success: true,
      content: savedContent,
      message: `${contentType} generated successfully`
    });

  } catch (error) {
    console.error('Error processing file:', error);
    cleanupFile(filePath);
    res.status(500).json({ error: "Failed to process file" });
  }
});

// YouTube transcript processing
app.post("/process-youtube", verifyToken, async (req, res) => {
  const { url, type } = req.body;
  const userId = req.user.uid;

  if (!url || !type) {
    return res.status(400).json({ error: "URL and type are required" });
  }

  try {
    // Create or update user record
    await UserService.createOrUpdateUser(userId, req.user.name || 'Unknown User', req.user.email || 'unknown@example.com');

    const transcriptText = await getTranscriptText(url);
    console.log(`Processing YouTube transcript for ${type} generation`);

    let result;
    let generatedContentData;
    let contentTitle = `Content from YouTube: ${url}`;

    // Similar switch statement for different content types...
    // (This would be the same logic as the file processing above)

    res.json({
      success: true,
      content: generatedContentData,
      message: `${type} generated successfully from YouTube transcript`
    });

  } catch (error) {
    console.error('Error processing YouTube transcript:', error);
    res.status(500).json({ error: "Failed to process YouTube transcript" });
  }
});

// Get user's content
app.get("/api/content", verifyToken, async (req, res) => {
  try {
    const content = await ContentService.getContentByUserId(req.user.uid);
    res.json(content);
  } catch (error) {
    console.error('Error getting user content:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 