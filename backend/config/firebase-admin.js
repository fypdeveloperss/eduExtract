const admin = require('firebase-admin');
require('dotenv').config();

// Singleton pattern for Firebase Admin initialization
class FirebaseAdminService {
  constructor() {
    this.isInitialized = false;
    this.auth = null;
    this.tokenCache = new Map();
    this.TOKEN_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    
    // Performance metrics
    this.metrics = {
      tokenVerifications: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgResponseTime: 0
    };
    
    this.initializeFirebase();
    this.setupCacheCleanup();
  }

  initializeFirebase() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check if Firebase Admin is already initialized
      let app;
      try {
        app = admin.app(); // Try to get existing default app
        console.log('✅ Using existing Firebase Admin app');
      } catch (error) {
        // No existing app, create new one
        app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
          })
        });
        console.log('✅ Created new Firebase Admin app');
      }

      // Pre-initialize auth instance for better performance
      this.auth = app.auth();
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ Firebase Admin initialization failed:', error.message);
      throw error;
    }
  }

  setupCacheCleanup() {
    // Clean expired tokens every 5 minutes
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [token, data] of this.tokenCache.entries()) {
        if (data.expiry < now) {
          this.tokenCache.delete(token);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired tokens from cache`);
      }
    }, 5 * 60 * 1000);
  }

  async verifyTokenOptimized(token) {
    const startTime = Date.now();
    this.metrics.tokenVerifications++;

    try {
      // Check cache first
      const cachedData = this.tokenCache.get(token);
      if (cachedData && cachedData.expiry > Date.now()) {
        this.metrics.cacheHits++;
        return cachedData.userData;
      }

      this.metrics.cacheMisses++;

      // Verify with Firebase with timeout
      const verifyPromise = this.auth.verifyIdToken(token, true);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Token verification timeout')), 3000);
      });

      const decodedToken = await Promise.race([verifyPromise, timeoutPromise]);

      // Cache the result
      this.tokenCache.set(token, {
        userData: decodedToken,
        expiry: Date.now() + this.TOKEN_CACHE_TTL
      });

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.metrics.avgResponseTime = 
        (this.metrics.avgResponseTime + responseTime) / 2;

      return decodedToken;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`Token verification failed (${responseTime}ms):`, error.message);
      throw error;
    }
  }

  // Predefined admin UIDs
  getAdminUIDs() {
    return [
      '13zeFEG6XqTUtc0muOzZl3Ikba32',
      'Im9sZ0RPFyOjyzYv90dqeB7xCT43',
      '20P183w4gzUlWyUKFFWYu6iOLoM2'
    ];
  }

  isAdmin(uid) {
    return this.getAdminUIDs().includes(uid);
  }

  // Performance monitoring
  getMetrics() {
    const cacheHitRate = this.metrics.cacheHits / 
      (this.metrics.cacheHits + this.metrics.cacheMisses) || 0;
    
    return {
      ...this.metrics,
      cacheSize: this.tokenCache.size,
      cacheHitRate: Math.round(cacheHitRate * 100) + '%',
      avgResponseTime: Math.round(this.metrics.avgResponseTime) + 'ms'
    };
  }

  // Cache management
  clearCache() {
    this.tokenCache.clear();
    console.log('🗑️ Token cache cleared');
  }

  invalidateToken(token) {
    this.tokenCache.delete(token);
  }

  invalidateUserTokens(uid) {
    for (const [token, data] of this.tokenCache.entries()) {
      if (data.userData.uid === uid) {
        this.tokenCache.delete(token);
      }
    }
  }
}

// Create singleton instance
const firebaseService = new FirebaseAdminService();

// Optimized middleware functions
const verifyToken = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token || token.length < 10) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ 
        error: 'Invalid token structure' 
      });
    }

    // Use optimized verification
    const decodedToken = await firebaseService.verifyTokenOptimized(token);
    
    req.user = decodedToken;
    req.user.isAdmin = firebaseService.isAdmin(decodedToken.uid);
    
    next();

  } catch (error) {
    console.error(`❌ Token verification failed (${Date.now() - startTime}ms):`, error.message);
    
    if (error.message.includes('timeout')) {
      return res.status(408).json({ error: 'Authentication timeout' });
    } else if (error.message.includes('expired')) {
      return res.status(401).json({ error: 'Token expired' });
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
};

const verifyAdmin = async (req, res, next) => {
  try {
    await verifyToken(req, res, () => {
      if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Enhanced admin verification using database
const verifyAdminEnhanced = async (req, res, next) => {
  try {
    await verifyToken(req, res, async () => {
      try {
        // Check admin status using AdminService
        const AdminService = require('../services/adminService');
        const isAdminUser = await AdminService.isAdmin(req.user.uid);
        
        if (!isAdminUser) {
          return res.status(403).json({ error: 'Admin access required' });
        }
        
        req.userRole = await AdminService.getAdminRole(req.user.uid);
        next();
      } catch (error) {
        console.error('Error checking admin status:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Helper function to check if a user is admin
const isAdmin = (uid) => {
  return firebaseService.isAdmin(uid);
};

module.exports = {
  admin,
  firebaseService,
  verifyToken,
  verifyAdmin,
  verifyAdminEnhanced,
  isAdmin,
  
  // Performance monitoring
  getFirebaseMetrics: () => firebaseService.getMetrics(),
  clearFirebaseCache: () => firebaseService.clearCache(),
  
  // Legacy compatibility
  ADMIN_UIDS: firebaseService.getAdminUIDs()
}; 