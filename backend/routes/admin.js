const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/auth');
const UserService = require('../services/userService');
const ContentService = require('../services/contentService');

// Get admin dashboard stats
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const userStats = await UserService.getUserStats();
    const contentStats = await ContentService.getContentStats();
    
    res.json({
      users: userStats,
      content: contentStats
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Failed to get admin stats' });
  }
});

// Get content for specific user (admin only)
router.get('/content/:userId', verifyAdmin, async (req, res) => {
  try {
    const content = await ContentService.getContentByUserId(req.params.userId);
    res.json(content);
  } catch (error) {
    console.error('Error getting user content:', error);
    res.status(500).json({ error: 'Failed to get user content' });
  }
});

module.exports = router; 