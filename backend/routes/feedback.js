const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const AdminService = require('../services/adminService');

// ==================== USER FEEDBACK ROUTES ====================

/**
 * @route   POST /api/feedback
 * @desc    Submit user feedback (requires authentication)
 * @access  Private
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { subject, message, category, rating } = req.body;
    
    // Validation
    if (!subject || !message) {
      return res.status(400).json({ 
        error: 'Subject and message are required' 
      });
    }
    
    if (subject.length > 200) {
      return res.status(400).json({ 
        error: 'Subject must be 200 characters or less' 
      });
    }
    
    if (message.length > 2000) {
      return res.status(400).json({ 
        error: 'Message must be 2000 characters or less' 
      });
    }
    
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }
    
    // Get user info
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create feedback
    const feedback = new Feedback({
      userId: req.user.uid,
      email: user.email,
      name: user.name || user.email,
      subject: subject.trim(),
      message: message.trim(),
      category: category || 'general_feedback',
      rating: rating || null,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    await feedback.save();
    
    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: feedback._id
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * @route   GET /api/feedback/user
 * @desc    Get current user's feedback submissions
 * @access  Private
 */
router.get('/user', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const feedback = await Feedback.find({ userId: req.user.uid })
      .select('-internalNotes -ipAddress -userAgent') // Hide internal admin data
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Feedback.countDocuments({ userId: req.user.uid });
    
    res.json({
      feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

/**
 * @route   GET /api/feedback/categories
 * @desc    Get feedback categories for form dropdown
 * @access  Public
 */
router.get('/categories', (req, res) => {
  const categories = [
    { value: 'bug_report', label: 'Bug Report' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'general_feedback', label: 'General Feedback' },
    { value: 'user_experience', label: 'User Experience' },
    { value: 'content_quality', label: 'Content Quality' },
    { value: 'performance_issue', label: 'Performance Issue' },
    { value: 'other', label: 'Other' }
  ];
  
  res.json(categories);
});

// ==================== ADMIN FEEDBACK ROUTES ====================

/**
 * @route   GET /api/feedback/admin
 * @desc    Get all feedback for admin review
 * @access  Private (Admin)
 */
router.get('/admin', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { 
      page = 1, 
      limit = 20, 
      status, 
      category, 
      priority,
      search 
    } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const feedback = await Feedback.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Feedback.countDocuments(query);
    
    res.json({
      feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching admin feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

/**
 * @route   GET /api/feedback/admin/stats
 * @desc    Get feedback statistics for admin dashboard
 * @access  Private (Admin)
 */
router.get('/admin/stats', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const stats = await Feedback.getStats();
    
    // Get recent feedback trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyTrend = await Feedback.aggregate([
      {
        $match: {
          submittedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.json({
      ...stats,
      dailyTrend
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ error: 'Failed to fetch feedback stats' });
  }
});

/**
 * @route   GET /api/feedback/admin/:id
 * @desc    Get specific feedback details for admin
 * @access  Private (Admin)
 */
router.get('/admin/:id', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const feedback = await Feedback.findById(req.params.id).lean();
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    // Get user info
    const user = await User.findOne({ uid: feedback.userId })
      .select('name email createdAt lastLogin')
      .lean();
    
    res.json({
      ...feedback,
      userInfo: user
    });
  } catch (error) {
    console.error('Error fetching feedback details:', error);
    res.status(500).json({ error: 'Failed to fetch feedback details' });
  }
});

/**
 * @route   PUT /api/feedback/admin/:id/status
 * @desc    Update feedback status and optionally add response
 * @access  Private (Admin)
 */
router.put('/admin/:id/status', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status, response, priority } = req.body;
    
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    // Update status and response
    if (status) {
      await feedback.updateStatus(status, req.user.uid, response);
    }
    
    // Update priority if provided
    if (priority) {
      feedback.priority = priority;
      await feedback.save();
    }
    
    res.json({
      success: true,
      message: 'Feedback updated successfully',
      feedback
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

/**
 * @route   POST /api/feedback/admin/:id/note
 * @desc    Add internal note to feedback
 * @access  Private (Admin)
 */
router.post('/admin/:id/note', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { note } = req.body;
    
    if (!note || !note.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }
    
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    await feedback.addInternalNote(note.trim(), req.user.uid);
    
    res.json({
      success: true,
      message: 'Note added successfully'
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

/**
 * @route   PUT /api/feedback/admin/:id/priority
 * @desc    Update feedback priority
 * @access  Private (Admin)
 */
router.put('/admin/:id/priority', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { priority } = req.body;
    
    if (!priority || !['low', 'medium', 'high', 'critical'].includes(priority)) {
      return res.status(400).json({ error: 'Valid priority is required' });
    }
    
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { priority },
      { new: true }
    );
    
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    res.json({
      success: true,
      message: 'Priority updated successfully',
      feedback
    });
  } catch (error) {
    console.error('Error updating priority:', error);
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

/**
 * @route   DELETE /api/feedback/admin/:id
 * @desc    Delete feedback (admin only - use with caution)
 * @access  Private (Admin)
 */
router.delete('/admin/:id', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

/**
 * @route   POST /api/feedback/admin/bulk-update
 * @desc    Bulk update feedback status/priority
 * @access  Private (Admin)
 */
router.post('/admin/bulk-update', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { feedbackIds, updates } = req.body;
    
    if (!feedbackIds || !Array.isArray(feedbackIds) || feedbackIds.length === 0) {
      return res.status(400).json({ error: 'Valid feedback IDs array is required' });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Updates object is required' });
    }
    
    const validUpdates = {};
    if (updates.status) validUpdates.status = updates.status;
    if (updates.priority) validUpdates.priority = updates.priority;
    if (updates.followUpRequired !== undefined) validUpdates.followUpRequired = updates.followUpRequired;
    
    const result = await Feedback.updateMany(
      { _id: { $in: feedbackIds } },
      validUpdates
    );
    
    res.json({
      success: true,
      message: `${result.modifiedCount} feedback items updated successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk updating feedback:', error);
    res.status(500).json({ error: 'Failed to bulk update feedback' });
  }
});

module.exports = router;