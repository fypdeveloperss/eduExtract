const admin = require('firebase-admin');
require('dotenv').config();

// Debug logs
console.log('Environment variables:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('FIREBASE_PRIVATE_KEY exists:', !!process.env.FIREBASE_PRIVATE_KEY);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

// Predefined admin UIDs - Add your admin Firebase UIDs here
const ADMIN_UIDS = [
  '13zeFEG6XqTUtc0muOzZl3Ikba32',
  'Im9sZ0RPFyOjyzYv90dqeB7xCT43',
  '20P183w4gzUlWyUKFFWYu6iOLoM2'
  // Add your admin UIDs here
  // Example: 'your-firebase-uid-here',
  // You can get your UID from Firebase Auth or by logging in and checking the user object
];

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to verify admin status
const verifyAdmin = async (req, res, next) => {
  try {
    // First verify the token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user is in admin list
    if (!ADMIN_UIDS.includes(decodedToken.uid)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying admin token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Helper function to check if a user is admin (legacy support)
const isAdmin = (uid) => {
  return ADMIN_UIDS.includes(uid);
};

// Enhanced admin verification using database
const verifyAdminEnhanced = async (req, res, next) => {
  try {
    // First verify the token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check admin status using AdminService
    const AdminService = require('../services/adminService');
    const isAdminUser = await AdminService.isAdmin(decodedToken.uid);
    
    if (!isAdminUser) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = decodedToken;
    req.userRole = await AdminService.getAdminRole(decodedToken.uid);
    next();
  } catch (error) {
    console.error('Error verifying enhanced admin token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = {
  admin,
  verifyToken,
  verifyAdmin,
  verifyAdminEnhanced,
  isAdmin,
  ADMIN_UIDS
}; 