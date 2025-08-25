const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const UserService = require('../services/userService');
const AdminService = require('../services/adminService');

// Debug endpoints (must come before /:userId route)
router.get('/debug', verifyToken, async (req, res) => {
  try {
    const user = await UserService.getUserByUid(req.user.uid);
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    const role = await AdminService.getAdminRole(req.user.uid);
    
    res.json({
      uid: req.user.uid,
      user: user,
      isAdmin: isAdminUser,
      role: role,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Debug failed', details: error.message });
  }
});

// Get current user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await UserService.getUserByUid(req.user.uid);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await UserService.updateUser(req.user.uid, { name, email });
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
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

// Admin: Get all users with pagination
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { page = 1, limit = 20, search } = req.query;
    console.log(`Admin ${req.user.uid} requesting users with page=${page}, limit=${limit}, search=${search}`);
    
    const users = await UserService.getAllUsers(parseInt(page), parseInt(limit), search);
    console.log(`Returning ${users.users ? users.users.length : 'unknown'} users`);
    
    res.json(users);
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Admin: Get user by ID
router.get('/admin/:userId', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const user = await UserService.getUserByUid(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Admin: Update user
router.put('/admin/:userId', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { name, email, isActive } = req.body;
    const user = await UserService.updateUser(req.params.userId, { name, email, isActive });
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Admin: Delete user
router.delete('/admin/:userId', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const deleted = await UserService.deleteUser(req.params.userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get all users (admin only) - legacy endpoint
router.get('/', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const result = await UserService.getAllUsers();
    // If it's paginated response, extract just the users array
    const users = result.users || result;
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID (admin only) - legacy endpoint (must come last)
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
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

module.exports = router; 