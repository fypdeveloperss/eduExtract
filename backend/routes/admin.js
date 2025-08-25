const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const UserService = require('../services/userService');
const ContentService = require('../services/contentService');
const AdminService = require('../services/adminService');

// Check if user is admin (basic check)
router.get('/check', verifyToken, async (req, res) => {
  try {
    console.log('Admin check requested for UID:', req.user.uid);
    const { ADMIN_UIDS } = require('../config/firebase-admin');
    console.log('Available admin UIDs:', ADMIN_UIDS);
    const adminStatus = ADMIN_UIDS.includes(req.user.uid);
    console.log('Is admin?', adminStatus);
    res.json({ isAdmin: adminStatus });
  } catch (error) {
    console.error("Error checking admin status:", error.message);
    res.status(500).json({ error: "Failed to check admin status" });
  }
});

// Enhanced admin check
router.get('/check-enhanced', verifyToken, async (req, res) => {
  try {
    console.log('Enhanced admin check requested for UID:', req.user.uid);
    
    const adminStatus = await AdminService.isAdmin(req.user.uid);
    const role = await AdminService.getAdminRole(req.user.uid);
    
    console.log('Enhanced admin check - isAdmin:', adminStatus, 'role:', role);
    res.json({ 
      isAdmin: adminStatus,
      role: role
    });
  } catch (error) {
    console.error("Error checking enhanced admin status:", error.message);
    res.status(500).json({ error: "Failed to check admin status" });
  }
});

// Get admin dashboard stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const userStats = await UserService.getUserStats();
    const contentStats = await ContentService.getContentStats();
    const adminStats = await AdminService.getAdminStats();
    
    res.json({
      users: userStats,
      content: contentStats,
      admins: adminStats
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Failed to get admin stats' });
  }
});

// Get content for specific user (admin only)
router.get('/content/:userId', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { userId } = req.params;
    const User = require('../models/User');
    const GeneratedContent = require('../models/GeneratedContent');
    
    // Get user info
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get user's content
    const content = await GeneratedContent.find({ userId }).sort({ createdAt: -1 });
    
    res.json({
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      content: content
    });
  } catch (error) {
    console.error('Error getting user content:', error);
    res.status(500).json({ error: 'Failed to get user content' });
  }
});

// Admin Management Routes

// Get all admins (super admin only)
router.get('/admins', verifyToken, async (req, res) => {
  try {
    const userRole = await AdminService.getAdminRole(req.user.uid);
    
    if (userRole !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    
    const admins = await AdminService.getAllAdmins();
    res.json(admins);
  } catch (error) {
    console.error('Error getting admins:', error);
    res.status(500).json({ error: 'Failed to get admins' });
  }
});

// Add admin by email (super admin only)
router.post('/admins', verifyToken, async (req, res) => {
  try {
    const userRole = await AdminService.getAdminRole(req.user.uid);
    
    if (userRole !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    const { email, role = 'admin' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const admin = await AdminService.addAdminByEmail(email, req.user.uid, role);
    res.json({ success: true, admin });
  } catch (error) {
    console.error('Error adding admin:', error);
    res.status(400).json({ error: error.message });
  }
});

// Remove admin (super admin only)
router.delete('/admins/:adminUid', verifyToken, async (req, res) => {
  try {
    const userRole = await AdminService.getAdminRole(req.user.uid);
    
    if (userRole !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    const { adminUid } = req.params;
    const admin = await AdminService.removeAdmin(adminUid, req.user.uid);
    res.json({ success: true, admin });
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update admin role (super admin only)
router.put('/admins/:adminUid/role', verifyToken, async (req, res) => {
  try {
    const userRole = await AdminService.getAdminRole(req.user.uid);
    
    if (userRole !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    const { adminUid } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'moderator'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (admin or moderator)' });
    }

    const admin = await AdminService.updateAdminRole(adminUid, role, req.user.uid);
    res.json({ success: true, admin });
  } catch (error) {
    console.error('Error updating admin role:', error);
    res.status(400).json({ error: error.message });
  }
});

// Debug endpoint for admin status
router.get('/debug/admin-status', verifyToken, async (req, res) => {
  try {
    const { ADMIN_UIDS } = require('../config/firebase-admin');
    const User = require('../models/User');
    
    // Check if user exists in Users collection
    const userInDb = await User.findOne({ uid: req.user.uid });
    
    // Check hardcoded admin status
    const isHardcodedAdmin = ADMIN_UIDS.includes(req.user.uid);
    
    // Check database admin status
    const isDatabaseAdmin = await AdminService.isAdmin(req.user.uid);
    const adminRole = await AdminService.getAdminRole(req.user.uid);
    
    // Get all admins from database
    const allAdmins = await AdminService.getAllAdmins();
    
    res.json({
      currentUser: {
        uid: req.user.uid,
        email: req.user.email,
        name: req.user.name
      },
      userInDb: userInDb,
      isHardcodedAdmin,
      isDatabaseAdmin,
      adminRole,
      hardcodedAdminUIDs: ADMIN_UIDS,
      allAdminsInDb: allAdmins
    });
  } catch (error) {
    console.error('Error in debug admin status:', error);
    res.status(500).json({ error: 'Debug failed: ' + error.message });
  }
});

module.exports = router; 