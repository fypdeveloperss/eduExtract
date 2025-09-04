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

// 404 handler - catch all remaining routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Available routes:');
  console.log('  - Authentication: /api/auth/*');
  console.log('  - Users: /api/users/*');
  console.log('  - Admin: /api/admin/*');
  console.log('  - Content: /api/content/*');
  console.log('  - Marketplace: /api/marketplace/*');
  console.log('  - Generation: /generate-*, /process-file, /api/chat');
  console.log('  - Health check: /health');
});
