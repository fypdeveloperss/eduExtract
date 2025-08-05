const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const UserService = require('../services/userService');

// Get all users (admin only)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const users = await UserService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID (admin only)
router.get('/:userId', verifyAdmin, async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Create or update user
router.post('/', verifyToken, async (req, res) => {
  try {
    const { uid, name, email } = req.body;
    const user = await UserService.createOrUpdateUser(uid, name, email);
    res.json(user);
  } catch (error) {
    console.error('Error creating/updating user:', error);
    res.status(500).json({ error: 'Failed to create/update user' });
  }
});

module.exports = router; 