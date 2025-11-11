const express = require('express');
const router = express.Router();
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ContentService = require('../services/contentService');
const AdminService = require('../services/adminService');

// Import models
const GeneratedContent = require('../models/GeneratedContent');
const QuizAttempt = require('../models/QuizAttempt');

// Utility function to get transcript from video file
async function getTranscript(filePath) {
  return new Promise((resolve, reject) => {
    const command = `python get_transcript.py "${filePath}"`;
    exec(command, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error('Error getting transcript:', error);
        reject(error);
      } else if (stderr) {
        console.error('Python script error:', stderr);
        reject(new Error(stderr));
      } else {
        resolve(stdout.trim());
      }
    });
  });
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

// Get user's content
router.get('/', verifyToken, async (req, res) => {
  try {
    const content = await ContentService.getContentByUserId(req.user.uid);
    res.json(content);
  } catch (error) {
    console.error('Error retrieving content:', error);
    res.status(500).json({ error: 'Failed to retrieve content' });
  }
});

// Generate content from text
router.post('/text', verifyToken, async (req, res) => {
  try {
    const { text, title } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }
    
    // For now, we'll just save the text as content
    // In a full implementation, you would process this with AI
    const savedContent = await saveUserContent(req.user.uid, title || 'Text Content', 'text', text, { text });
    
    res.json(savedContent);
  } catch (error) {
    console.error('Error processing text:', error);
    res.status(500).json({ error: 'Failed to process text' });
  }
});

// Process video file for transcript and content generation
router.post('/video', verifyToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    const { title } = req.body;
    const filePath = req.file.path;
    
    // Get transcript from video
    const transcript = await getTranscript(filePath);
    
    if (!transcript) {
      return res.status(500).json({ error: 'Failed to extract transcript from video' });
    }
    
    // Save content with transcript
    const savedContent = await saveUserContent(req.user.uid, title || 'Video Content', 'video', transcript, { transcript });
    
    res.json(savedContent);
  } catch (error) {
    console.error('Error processing video:', error);
    res.status(500).json({ error: 'Failed to process video file' });
  }
});

// Admin: Get all content with pagination (must come before /:contentId)
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { page = 1, limit = 20 } = req.query;
    const content = await ContentService.getAllContent(parseInt(page), parseInt(limit));
    
    res.json(content);
  } catch (error) {
    console.error('Error retrieving all content:', error);
    res.status(500).json({ error: 'Failed to retrieve content' });
  }
});

// Admin: Delete any content
router.delete('/admin/:contentId', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const deleted = await ContentService.deleteContentAdmin(req.params.contentId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// Get specific content by ID (must come after specific routes)
router.get('/:contentId', verifyToken, async (req, res) => {
  try {
    const content = await ContentService.getContentById(req.params.contentId, req.user.uid);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.json(content);
  } catch (error) {
    console.error('Error retrieving content:', error);
    res.status(500).json({ error: 'Failed to retrieve content' });
  }
});

// Delete content (must come after specific routes)
router.delete('/:contentId', verifyToken, async (req, res) => {
  try {
    const deleted = await ContentService.deleteContent(req.params.contentId, req.user.uid);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// Save quiz attempt
router.post('/quiz-attempt', verifyToken, async (req, res) => {
  try {
    const { quizId, userAnswers, timeSpent = 0 } = req.body;
    const userId = req.user.uid;

    if (!quizId || !userAnswers) {
      return res.status(400).json({ error: 'Quiz ID and user answers are required' });
    }

    // Get the original quiz data
    const quiz = await GeneratedContent.findById(quizId);
    if (!quiz || quiz.type !== 'quiz') {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const quizData = quiz.contentData;
    const totalQuestions = quizData.length;
    let correctCount = 0;

    // Calculate score - handle both 'answer' and 'correctAnswer' fields
    const correctAnswers = quizData.map(q => {
      // Try multiple possible field names for the correct answer
      return q.answer || q.correctAnswer || q.correct || null;
    });
    
    userAnswers.forEach((answer, index) => {
      const correctAnswer = correctAnswers[index];
      // Compare answers (case-insensitive and trimmed for better matching)
      if (correctAnswer && answer && 
          String(answer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()) {
        correctCount++;
      } else {
        console.log(`Question ${index + 1} mismatch: User answer="${answer}", Correct answer="${correctAnswer}"`);
      }
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    
    console.log(`Quiz score calculation: ${correctCount}/${totalQuestions} = ${score}%`);

    // Save quiz attempt
    const quizAttempt = new QuizAttempt({
      userId,
      quizId,
      quizTitle: quiz.title,
      quizData,
      userAnswers,
      correctAnswers,
      score,
      totalQuestions,
      correctCount,
      timeSpent,
      completedAt: new Date(),
      isCompleted: true
    });

    await quizAttempt.save();
    
    console.log('Quiz attempt saved:', {
      quizId: quizAttempt.quizId,
      userId: quizAttempt.userId,
      score: quizAttempt.score
    });

    res.json({
      success: true,
      attempt: {
        id: quizAttempt._id,
        score,
        correctCount,
        totalQuestions,
        completedAt: quizAttempt.completedAt
      }
    });

  } catch (error) {
    console.error('Error saving quiz attempt:', error);
    res.status(500).json({ error: 'Failed to save quiz attempt' });
  }
});

// Get user's quiz attempts
router.get('/user/quiz-attempts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { quizId } = req.query;

    let query = { userId };
    if (quizId) {
      query.quizId = quizId;
    }

    const attempts = await QuizAttempt.find(query)
      .populate('quizId', 'title type createdAt')
      .sort({ completedAt: -1 });

    console.log('Quiz attempts found:', attempts.length);
    console.log('Quiz attempts data:', attempts.map(a => ({ quizId: a.quizId, score: a.score })));

    res.json(attempts);
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    res.status(500).json({ error: 'Failed to fetch quiz attempts' });
  }
});

module.exports = router;
