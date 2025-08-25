const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');

// Check admin status (legacy)
router.get('/admin/check', verifyToken, async (req, res) => {
  try {
    console.log('Legacy admin check requested for UID:', req.user.uid);
    console.log('Available admin UIDs:', require('../config/firebase-admin').ADMIN_UIDS);
    const adminStatus = isAdmin(req.user.uid);
    console.log('Is admin?', adminStatus);
    res.json({ isAdmin: adminStatus });
  } catch (error) {
    console.error("Error checking admin status:", error.message);
    res.status(500).json({ error: "Failed to check admin status" });
  }
});

// Enhanced admin check using AdminService
router.get('/admin/check-enhanced', verifyToken, async (req, res) => {
  try {
    console.log('Enhanced admin check requested for UID:', req.user.uid);
    const AdminService = require('../services/adminService');
    
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

module.exports = router; 