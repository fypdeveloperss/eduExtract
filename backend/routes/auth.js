const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');

// Check admin status
router.get('/admin/check', verifyToken, async (req, res) => {
  try {
    console.log('Admin check requested for UID:', req.user.uid);
    console.log('Available admin UIDs:', require('../config/firebase-admin').ADMIN_UIDS);
    const adminStatus = isAdmin(req.user.uid);
    console.log('Is admin?', adminStatus);
    res.json({ isAdmin: adminStatus });
  } catch (error) {
    console.error("Error checking admin status:", error.message);
    res.status(500).json({ error: "Failed to check admin status" });
  }
});

module.exports = router; 