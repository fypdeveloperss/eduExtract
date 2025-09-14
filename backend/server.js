const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eduExtract';

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(mongoUri)
  .then(() => {
    console.log('MongoDB connected successfully');
    // Initialize super admin from hardcoded admin UIDs
    initializeSuperAdmins();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize super admins
async function initializeSuperAdmins() {
  try {
    const AdminService = require('./services/adminService');
    const { ADMIN_UIDS } = require('./config/firebase-admin');
    const User = require('./models/User');
    
    for (const uid of ADMIN_UIDS) {
      try {
        // Try to get user info from Users collection
        const user = await User.findOne({ uid });
        if (user) {
          await AdminService.initializeSuperAdmin(uid, user.email, user.name);
        } else {
          console.log(`Warning: Super admin UID ${uid} not found in users collection`);
        }
      } catch (error) {
        console.error(`Error initializing super admin ${uid}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error during super admin initialization:', error);
  }
}

// Import route modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const contentRoutes = require('./routes/content');
const marketplaceRoutes = require('./routes/marketplace');
const collaborationRoutes = require('./routes/collaboration');

// Import generation routes
const generationRoutes = require('./routes/generation');
const forumRoutes = require('./routes/forum');

// Use route modules
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/collaborate', collaborationRoutes);

// Content generation routes (includes both root-level and /api routes)
app.use('/', generationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Performance monitoring routes
app.get('/api/performance/firebase', (req, res) => {
  try {
    const { getFirebaseMetrics } = require('./config/firebase-admin');
    res.json({
      success: true,
      metrics: getFirebaseMetrics(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/performance/socket', (req, res) => {
  try {
    // This will be set after socketManager is initialized
    if (global.socketManager) {
      res.json({
        success: true,
        metrics: global.socketManager.getPerformanceMetrics(),
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: false,
        error: 'Socket manager not initialized yet'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/performance/clear-cache', (req, res) => {
  try {
    // Clear Firebase cache
    const { clearFirebaseCache } = require('./config/firebase-admin');
    clearFirebaseCache();
    
    // Clear Socket cache if available
    if (global.socketManager) {
      global.socketManager.clearAllCaches();
    }
    
    res.json({
      success: true,
      message: 'All caches cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler - catch all remaining routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Available routes:');
  console.log('  - Authentication: /api/auth/*');
  console.log('  - Users: /api/users/*');
  console.log('  - Admin: /api/admin/*');
  console.log('  - Content: /api/content/*');
  console.log('  - Marketplace: /api/marketplace/*');
  console.log('  - Collaboration: /api/collaborate/*');
  console.log('  - Generation: /generate-*, /process-file, /api/chat');
  console.log('  - Health check: /health');
});

// Initialize Socket.IO for real-time collaboration
const SocketManager = require('./services/socketManager');
const CollaborationService = require('./services/collaborationService');
const SharedContentService = require('./services/sharedContentService');

// Initialize services efficiently
console.log('Initializing services...');

// Create socket manager
const socketManager = new SocketManager(server);

// Create collaboration service with socket manager
const collaborationService = new CollaborationService(socketManager);

// Connect socket manager with collaboration service 
socketManager.setCollaborationService(collaborationService);

// Make services available globally (but keep limited exposure)
global.collaborationService = collaborationService;
global.socketManager = socketManager; // Add this for performance monitoring

// Initialize collaboration routes with socket manager
collaborationRoutes.setSocketManager(socketManager);

console.log('Socket.IO and services initialized for real-time collaboration');
console.log('🚀 Performance monitoring available at:');
console.log('  - Firebase metrics: GET /api/performance/firebase');
console.log('  - Socket metrics: GET /api/performance/socket');
console.log('  - Clear caches: POST /api/performance/clear-cache');
