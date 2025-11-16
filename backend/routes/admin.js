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

// Get AI Performance Metrics
router.get('/ai-metrics', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const GeneratedContent = require('../models/GeneratedContent');
    
    // Get total generations
    const totalGenerations = await GeneratedContent.countDocuments();
    
    // Calculate success rate (assuming all saved content is successful)
    // In a real system, you'd track failures separately
    const successRate = totalGenerations > 0 ? 95 : 0; // Placeholder
    
    // Get content by type
    const contentByType = await GeneratedContent.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Build metrics by content type
    const byContentType = {
      summary: { count: 0, success: 0, avgTime: 0 },
      blog: { count: 0, success: 0, avgTime: 0 },
      quiz: { count: 0, success: 0, avgTime: 0 },
      flashcards: { count: 0, success: 0, avgTime: 0 },
      slides: { count: 0, success: 0, avgTime: 0 }
    };
    
    contentByType.forEach(item => {
      if (byContentType[item._id]) {
        byContentType[item._id].count = item.count;
        byContentType[item._id].success = Math.round(item.count * 0.95); // Placeholder
        byContentType[item._id].avgTime = 2500; // Placeholder in ms
      }
    });
    
    res.json({
      totalGenerations,
      successRate,
      averageResponseTime: 2500, // Placeholder
      totalTokensUsed: totalGenerations * 2000, // Placeholder
      errorRate: 100 - successRate,
      byContentType
    });
  } catch (error) {
    console.error('Error getting AI metrics:', error);
    res.status(500).json({ error: 'Failed to get AI metrics' });
  }
});

// Get System Analytics
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const User = require('../models/User');
    const GeneratedContent = require('../models/GeneratedContent');
    
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Activity metrics
    const todayActivity = await GeneratedContent.countDocuments({
      createdAt: { $gte: today }
    });
    
    const thisWeekActivity = await GeneratedContent.countDocuments({
      createdAt: { $gte: weekAgo }
    });
    
    const thisMonthActivity = await GeneratedContent.countDocuments({
      createdAt: { $gte: monthAgo }
    });
    
    // User growth (last 30 days)
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: monthAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Content trends (last 30 days)
    const contentTrends = await GeneratedContent.aggregate([
      {
        $match: {
          createdAt: { $gte: monthAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.json({
      userGrowth: userGrowth.map(item => ({ date: item._id, count: item.count })),
      contentTrends: contentTrends.map(item => ({ date: item._id, count: item.count })),
      activityMetrics: {
        today: todayActivity,
        thisWeek: thisWeekActivity,
        thisMonth: thisMonthActivity
      }
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get Flagged Content
router.get('/flagged-content', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const MarketplaceContent = require('../models/MarketplaceContent');
    
    // Get flagged marketplace content
    const flaggedMarketplace = await MarketplaceContent.find({
      status: 'pending'
    }).sort({ createdAt: -1 }).limit(50);
    
    // Format flagged content
    const flaggedContent = flaggedMarketplace.map(item => ({
      _id: item._id,
      title: item.title,
      type: 'marketplace',
      reason: 'Pending review',
      flaggedAt: item.createdAt,
      userId: item.userId
    }));
    
    res.json({
      flaggedContent,
      total: flaggedContent.length
    });
  } catch (error) {
    console.error('Error getting flagged content:', error);
    res.status(500).json({ error: 'Failed to get flagged content' });
  }
});

// Get Recent Activity
router.get('/recent-activity', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const User = require('../models/User');
    const GeneratedContent = require('../models/GeneratedContent');
    
    // Get recent content generation
    const recentContent = await GeneratedContent.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    // Get recent user registrations
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    // Format activities
    const activities = [
      ...recentContent.map(item => ({
        type: 'content_generated',
        description: `User generated ${item.type}: ${item.title}`,
        timestamp: item.createdAt,
        userId: item.userId
      })),
      ...recentUsers.map(user => ({
        type: 'user_registered',
        description: `New user registered: ${user.name || user.email}`,
        timestamp: user.createdAt,
        userId: user.uid
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 30);
    
    res.json({
      activities
    });
  } catch (error) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({ error: 'Failed to get recent activity' });
  }
});

// Content Actions (Approve/Reject)
router.post('/content/:contentId/:action', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { contentId, action } = req.params;
    const MarketplaceContent = require('../models/MarketplaceContent');
    
    if (action === 'approve') {
      await MarketplaceContent.findByIdAndUpdate(contentId, {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: req.user.uid
      });
    } else if (action === 'reject') {
      await MarketplaceContent.findByIdAndUpdate(contentId, {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: req.user.uid
      });
    } else {
      return res.status(400).json({ error: 'Invalid action. Use approve or reject' });
    }
    
    res.json({ success: true, message: `Content ${action}d successfully` });
  } catch (error) {
    console.error(`Error ${req.params.action}ing content:`, error);
    res.status(500).json({ error: `Failed to ${req.params.action} content` });
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

// ==================== CONTENT QUALITY HUB ====================

// Get content quality metrics
router.get('/content-quality/metrics', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const GeneratedContent = require('../models/GeneratedContent');
    
    // Get content by type with quality indicators
    const contentByType = await GeneratedContent.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          recentCount: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get flagged content count (only explicitly flagged)
    const flaggedCount = await GeneratedContent.countDocuments({
      flagged: true
    });

    // Calculate average content age
    const avgAge = await GeneratedContent.aggregate([
      {
        $group: {
          _id: null,
          avgAge: {
            $avg: {
              $subtract: [new Date(), '$createdAt']
            }
          }
        }
      }
    ]);

    const metrics = {
      totalContent: await GeneratedContent.countDocuments(),
      flaggedContent: flaggedCount,
      contentByType: contentByType.reduce((acc, item) => {
        acc[item._id] = {
          total: item.count,
          recent: item.recentCount
        };
        return acc;
      }, {}),
      averageAge: avgAge[0]?.avgAge || 0
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error getting content quality metrics:', error);
    res.status(500).json({ error: 'Failed to get content quality metrics' });
  }
});

// Get content for quality review
router.get('/content-quality/review', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, type, flagged } = req.query;
    const GeneratedContent = require('../models/GeneratedContent');
    const User = require('../models/User');

    const query = {};
    if (type) query.type = type;
    if (flagged === 'true') {
      query.flagged = true;
    } else if (flagged === 'false') {
      query.$or = [
        { flagged: false },
        { flagged: { $exists: false } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const content = await GeneratedContent.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate user info
    const userIds = [...new Set(content.map(c => c.userId))];
    const users = await User.find({ uid: { $in: userIds } }).lean();
    const userMap = users.reduce((acc, u) => {
      acc[u.uid] = u;
      return acc;
    }, {});

    const contentWithUsers = content.map(item => ({
      ...item,
      user: userMap[item.userId] || { name: 'Unknown', email: 'N/A' }
    }));

    const total = await GeneratedContent.countDocuments(query);

    res.json({
      content: contentWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting content for review:', error);
    res.status(500).json({ error: 'Failed to get content for review' });
  }
});

// Flag content for quality review
router.post('/content-quality/flag/:contentId', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { contentId } = req.params;
    const { reason, qualityScore } = req.body;
    const GeneratedContent = require('../models/GeneratedContent');

    await GeneratedContent.findByIdAndUpdate(contentId, {
      flagged: true,
      flaggedAt: new Date(),
      flaggedBy: req.user.uid,
      flagReason: reason,
      qualityScore: qualityScore || 0
    });

    res.json({ success: true, message: 'Content flagged successfully' });
  } catch (error) {
    console.error('Error flagging content:', error);
    res.status(500).json({ error: 'Failed to flag content' });
  }
});

// Bulk actions on content
router.post('/content-quality/bulk-action', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { contentIds, action, reason } = req.body;
    const GeneratedContent = require('../models/GeneratedContent');

    if (action === 'flag') {
      await GeneratedContent.updateMany(
        { _id: { $in: contentIds } },
        {
          flagged: true,
          flaggedAt: new Date(),
          flaggedBy: req.user.uid,
          flagReason: reason
        }
      );
    } else if (action === 'unflag') {
      await GeneratedContent.updateMany(
        { _id: { $in: contentIds } },
        {
          flagged: false,
          flaggedAt: null,
          flaggedBy: null,
          flagReason: null
        }
      );
    } else if (action === 'delete') {
      await GeneratedContent.deleteMany({ _id: { $in: contentIds } });
    }

    res.json({ success: true, message: `Bulk ${action} completed successfully` });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

// ==================== SMART MENTOR MANAGEMENT ====================

// Get chat analytics
router.get('/smart-mentor/analytics', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const ChatHistory = require('../models/ChatHistory');
    const User = require('../models/User');

    // Get total chats
    const totalChats = await ChatHistory.countDocuments();
    
    // Get active sessions
    const activeSessions = await ChatHistory.countDocuments({ isActive: true });
    
    // Get total messages
    const totalMessages = await ChatHistory.aggregate([
      {
        $project: {
          messageCount: { $size: '$messages' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$messageCount' }
        }
      }
    ]);

    // Get chats by date (last 30 days)
    const chatsByDate = await ChatHistory.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get most active users
    const activeUsers = await ChatHistory.aggregate([
      {
        $group: {
          _id: '$userId',
          sessionCount: { $sum: 1 },
          messageCount: { $sum: { $size: '$messages' } }
        }
      },
      {
        $sort: { messageCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Populate user info
    const userIds = activeUsers.map(u => u._id);
    const users = await User.find({ uid: { $in: userIds } }).lean();
    const userMap = users.reduce((acc, u) => {
      acc[u.uid] = u;
      return acc;
    }, {});

    const activeUsersWithInfo = activeUsers.map(item => ({
      ...item,
      user: userMap[item._id] || { name: 'Unknown', email: 'N/A' }
    }));

    res.json({
      totalChats,
      activeSessions,
      totalMessages: totalMessages[0]?.total || 0,
      chatsByDate,
      activeUsers: activeUsersWithInfo
    });
  } catch (error) {
    console.error('Error getting chat analytics:', error);
    res.status(500).json({ error: 'Failed to get chat analytics' });
  }
});

// Get chat logs
router.get('/smart-mentor/logs', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, userId, flagged } = req.query;
    const ChatHistory = require('../models/ChatHistory');
    const User = require('../models/User');

    const query = {};
    if (userId) query.userId = userId;
    if (flagged === 'true') query.flagged = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const chats = await ChatHistory.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate user info
    const userIds = [...new Set(chats.map(c => c.userId))];
    const users = await User.find({ uid: { $in: userIds } }).lean();
    const userMap = users.reduce((acc, u) => {
      acc[u.uid] = u;
      return acc;
    }, {});

    const chatsWithUsers = chats.map(chat => ({
      ...chat,
      user: userMap[chat.userId] || { name: 'Unknown', email: 'N/A' },
      messageCount: chat.messages?.length || 0,
      lastMessage: chat.messages?.[chat.messages.length - 1] || null
    }));

    const total = await ChatHistory.countDocuments(query);

    res.json({
      chats: chatsWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting chat logs:', error);
    res.status(500).json({ error: 'Failed to get chat logs' });
  }
});

// Get specific chat session
router.get('/smart-mentor/session/:sessionId', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { sessionId } = req.params;
    const ChatHistory = require('../models/ChatHistory');
    const User = require('../models/User');

    const chat = await ChatHistory.findOne({ sessionId }).lean();
    if (!chat) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const user = await User.findOne({ uid: chat.userId }).lean();

    res.json({
      ...chat,
      user: user || { name: 'Unknown', email: 'N/A' }
    });
  } catch (error) {
    console.error('Error getting chat session:', error);
    res.status(500).json({ error: 'Failed to get chat session' });
  }
});

// Flag chat conversation
router.post('/smart-mentor/flag/:sessionId', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { sessionId } = req.params;
    const { reason } = req.body;
    const ChatHistory = require('../models/ChatHistory');

    await ChatHistory.findOneAndUpdate(
      { sessionId },
      {
        flagged: true,
        flaggedAt: new Date(),
        flaggedBy: req.user.uid,
        flagReason: reason
      }
    );

    res.json({ success: true, message: 'Chat session flagged successfully' });
  } catch (error) {
    console.error('Error flagging chat session:', error);
    res.status(500).json({ error: 'Failed to flag chat session' });
  }
});

// ==================== USER ENGAGEMENT ANALYTICS ====================

// Get user engagement metrics
router.get('/user-engagement/metrics', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const User = require('../models/User');
    const GeneratedContent = require('../models/GeneratedContent');
    const ChatHistory = require('../models/ChatHistory');

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total users
    const totalUsers = await User.countDocuments();

    // Active users (logged in within last 30 days)
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: monthAgo }
    });

    // New users
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: today }
    });
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: weekAgo }
    });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: monthAgo }
    });

    // Feature usage
    const contentGenerations = await GeneratedContent.countDocuments();
    const chatSessions = await ChatHistory.countDocuments();

    // Users by content type usage
    const contentUsageByType = await GeneratedContent.aggregate([
      {
        $group: {
          _id: '$type',
          uniqueUsers: { $addToSet: '$userId' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          type: '$_id',
          userCount: { $size: '$uniqueUsers' },
          totalCount: '$count'
        }
      }
    ]);

    // User retention (users who generated content in last 30 days)
    const retainedUsers = await GeneratedContent.distinct('userId', {
      createdAt: { $gte: monthAgo }
    });

    // Login patterns
    const loginPatterns = await User.aggregate([
      {
        $match: {
          lastLogin: { $gte: monthAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$lastLogin' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      totalUsers,
      activeUsers,
      newUsers: {
        today: newUsersToday,
        thisWeek: newUsersThisWeek,
        thisMonth: newUsersThisMonth
      },
      featureUsage: {
        contentGenerations,
        chatSessions,
        averageContentPerUser: totalUsers > 0 ? (contentGenerations / totalUsers).toFixed(2) : 0
      },
      contentUsageByType,
      retention: {
        retainedUsers: retainedUsers.length,
        retentionRate: totalUsers > 0 ? ((retainedUsers.length / totalUsers) * 100).toFixed(2) : 0
      },
      loginPatterns
    });
  } catch (error) {
    console.error('Error getting user engagement metrics:', error);
    res.status(500).json({ error: 'Failed to get user engagement metrics' });
  }
});

// Get user activity details
router.get('/user-engagement/activity', verifyToken, async (req, res) => {
  try {
    const isAdminUser = await AdminService.isAdmin(req.user.uid);
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, userId, dateRange } = req.query;
    const User = require('../models/User');
    const GeneratedContent = require('../models/GeneratedContent');
    const ChatHistory = require('../models/ChatHistory');

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users with activity stats
    let usersQuery = {};
    if (userId) {
      usersQuery.uid = userId;
    }

    const users = await User.find(usersQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get activity for each user
    const userIds = users.map(u => u.uid);
    
    const contentCounts = await GeneratedContent.aggregate([
      {
        $match: { userId: { $in: userIds } }
      },
      {
        $group: {
          _id: '$userId',
          totalContent: { $sum: 1 },
          contentByType: {
            $push: '$type'
          }
        }
      }
    ]);

    const chatCounts = await ChatHistory.aggregate([
      {
        $match: { userId: { $in: userIds } }
      },
      {
        $group: {
          _id: '$userId',
          totalChats: { $sum: 1 },
          totalMessages: {
            $sum: { $size: '$messages' }
          }
        }
      }
    ]);

    const contentMap = contentCounts.reduce((acc, item) => {
      acc[item._id] = item;
      return acc;
    }, {});

    const chatMap = chatCounts.reduce((acc, item) => {
      acc[item._id] = item;
      return acc;
    }, {});

    const usersWithActivity = users.map(user => ({
      ...user,
      activity: {
        totalContent: contentMap[user.uid]?.totalContent || 0,
        contentByType: contentMap[user.uid]?.contentByType || [],
        totalChats: chatMap[user.uid]?.totalChats || 0,
        totalMessages: chatMap[user.uid]?.totalMessages || 0
      }
    }));

    const total = await User.countDocuments(usersQuery);

    res.json({
      users: usersWithActivity,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting user activity:', error);
    res.status(500).json({ error: 'Failed to get user activity' });
  }
});

module.exports = router; 