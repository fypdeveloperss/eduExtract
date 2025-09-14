const { Server } = require('socket.io');
const CollaborationService = require('../services/collaborationService');

class SocketManager {
  constructor(server, collaborationService = null) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.collaborationService = collaborationService;
    this.collaborationRooms = new Map(); // spaceId -> Set of socketIds
    this.userSockets = new Map(); // userId -> Set of socketIds
    this.socketUsers = new Map(); // socketId -> userData
    
    // Performance optimization caches
    this.permissionCache = new Map(); // userId:spaceId -> { hasAccess, expiry }
    this.activeUsersCache = new Map(); // spaceId -> { users: [], lastUpdate }
    
    // Cache configuration
    this.PERMISSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    this.ACTIVE_USERS_CACHE_TTL = 30 * 1000; // 30 seconds
    
    // Cleanup interval for expired cache entries
    this.setupCacheCleanup();
    this.setupSocketHandlers();
  }

  setupCacheCleanup() {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      
      // Clean permission cache
      for (const [key, data] of this.permissionCache.entries()) {
        if (data.expiry < now) {
          this.permissionCache.delete(key);
        }
      }
      
      // Clean active users cache
      for (const [spaceId, data] of this.activeUsersCache.entries()) {
        if (data.lastUpdate + this.ACTIVE_USERS_CACHE_TTL < now) {
          this.activeUsersCache.delete(spaceId);
        }
      }
    }, 5 * 60 * 1000);
  }

  // Optimized active users retrieval with caching
  getActiveUsersOptimized(spaceId) {
    // Check cache first
    const cachedData = this.activeUsersCache.get(spaceId);
    if (cachedData && (Date.now() - cachedData.lastUpdate) < this.ACTIVE_USERS_CACHE_TTL) {
      return cachedData.users;
    }

    // Generate fresh user list
    const roomSockets = this.collaborationRooms.get(spaceId);
    if (!roomSockets) {
      return [];
    }

    const activeUsers = [];
    for (const socketId of roomSockets) {
      const userData = this.socketUsers.get(socketId);
      if (userData) {
        activeUsers.push(userData);
      }
    }

    // Cache the result
    this.activeUsersCache.set(spaceId, {
      users: activeUsers,
      lastUpdate: Date.now()
    });

    return activeUsers;
  }

  // Clear cache entries related to a specific user
  clearUserCache(userId) {
    // Clear permission cache for this user
    for (const [key, _] of this.permissionCache.entries()) {
      if (key.startsWith(`${userId}:`)) {
        this.permissionCache.delete(key);
      }
    }
  }

  // Clear cache entries related to a specific space
  clearSpaceCache(spaceId) {
    // Clear permission cache for this space
    for (const [key, _] of this.permissionCache.entries()) {
      if (key.endsWith(`:${spaceId}`)) {
        this.permissionCache.delete(key);
      }
    }
    
    // Clear active users cache
    this.activeUsersCache.delete(spaceId);
  }

  setCollaborationService(collaborationService) {
    this.collaborationService = collaborationService;
  }

  setupSocketHandlers() {
    // Simplified authentication - accept user data from client
    this.io.use(async (socket, next) => {
      try {
        const { userId, userName, userEmail } = socket.handshake.auth;
        
        if (!userId || !userEmail) {
          return next(new Error('Authentication error: Missing user credentials'));
        }

        // Store user data directly from client
        socket.userId = userId;
        socket.userEmail = userEmail;
        socket.userName = userName || userEmail.split('@')[0];
        
        console.log(`✅ Socket connected: ${socket.userEmail}`);
        next();
        
      } catch (error) {
        console.error(`❌ Socket connection failed:`, error.message);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userName} connected:`, socket.id);
      
      // Store socket mapping
      if (!this.userSockets.has(socket.userId)) {
        this.userSockets.set(socket.userId, new Set());
      }
      this.userSockets.get(socket.userId).add(socket.id);
      
      this.socketUsers.set(socket.id, {
        userId: socket.userId,
        userName: socket.userName,
        userEmail: socket.userEmail
      });

      // Handle joining collaboration spaces
      socket.on('join-space', async (data) => {
        await this.handleJoinSpace(socket, data);
      });

      // Handle leaving collaboration spaces
      socket.on('leave-space', async (data) => {
        await this.handleLeaveSpace(socket, data);
      });

      // Handle real-time content editing
      socket.on('content-edit', async (data) => {
        await this.handleContentEdit(socket, data);
      });

      // Handle cursor positions for collaborative editing
      socket.on('cursor-update', async (data) => {
        await this.handleCursorUpdate(socket, data);
      });

      // Handle live content generation
      socket.on('content-generation', async (data) => {
        await this.handleContentGeneration(socket, data);
      });

      // Handle user typing indicators
      socket.on('typing-start', async (data) => {
        await this.handleTypingStart(socket, data);
      });

      socket.on('typing-stop', async (data) => {
        await this.handleTypingStop(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  async handleJoinSpace(socket, { spaceId }) {
    try {
      // Check if collaborationService is available
      if (!this.collaborationService) {
        socket.emit('error', { message: 'Collaboration service not available' });
        return;
      }

      // Check permission cache first
      const permissionKey = `${socket.userId}:${spaceId}`;
      const cachedPermission = this.permissionCache.get(permissionKey);
      
      let hasAccess;
      if (cachedPermission && cachedPermission.expiry > Date.now()) {
        hasAccess = cachedPermission.hasAccess;
      } else {
        // Add timeout to database call
        const accessCheckPromise = this.collaborationService.checkUserSpaceAccess(socket.userId, spaceId);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Access check timeout')), 3000);
        });
        
        hasAccess = await Promise.race([accessCheckPromise, timeoutPromise]);
        
        // Cache the permission result
        this.permissionCache.set(permissionKey, {
          hasAccess,
          expiry: Date.now() + this.PERMISSION_CACHE_TTL
        });
      }

      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to collaboration space' });
        return;
      }

      // Join the socket room immediately for better UX
      socket.join(`space-${spaceId}`);
      
      // Track the room membership
      if (!this.collaborationRooms.has(spaceId)) {
        this.collaborationRooms.set(spaceId, new Set());
      }
      this.collaborationRooms.get(spaceId).add(socket.id);

      // Get optimized active users list
      const activeUsers = this.getActiveUsersOptimized(spaceId);

      // Send immediate response to joining user
      socket.emit('space-joined', {
        spaceId,
        activeUsers,
        timestamp: new Date()
      });

      // Make non-critical operations async (don't block the join)
      setImmediate(() => {
        // Notify other users in the space (non-blocking)
        socket.to(`space-${spaceId}`).emit('user-joined', {
          user: {
            userId: socket.userId,
            userName: socket.userName,
            userEmail: socket.userEmail
          },
          timestamp: new Date()
        });

        // Invalidate active users cache for this space
        this.activeUsersCache.delete(spaceId);
        
        console.log(`User ${socket.userName} joined space ${spaceId}`);
      });

    } catch (error) {
      console.error('Error joining space:', error);
      socket.emit('error', { message: 'Failed to join collaboration space' });
    }
  }

  async handleLeaveSpace(socket, { spaceId }) {
    try {
      socket.leave(`space-${spaceId}`);
      
      if (this.collaborationRooms.has(spaceId)) {
        this.collaborationRooms.get(spaceId).delete(socket.id);
        
        // Clean up empty rooms
        if (this.collaborationRooms.get(spaceId).size === 0) {
          this.collaborationRooms.delete(spaceId);
          // Clear cache for empty space
          this.clearSpaceCache(spaceId);
        } else {
          // Invalidate active users cache since user count changed
          this.activeUsersCache.delete(spaceId);
        }
      }

      // Make notification async (non-blocking)
      setImmediate(() => {
        // Notify other users in the space
        socket.to(`space-${spaceId}`).emit('user-left', {
          user: {
            userId: socket.userId,
            userName: socket.userName
          },
          timestamp: new Date()
        });

        console.log(`User ${socket.userName} left space ${spaceId}`);
      });

    } catch (error) {
      console.error('Error leaving space:', error);
    }
  }

  async handleContentEdit(socket, { spaceId, contentId, changes, contentType }) {
    try {
      // Verify user has edit permissions
      const canEdit = await CollaborationService.checkUserContentPermissions(
        socket.userId, 
        spaceId, 
        contentId, 
        'edit'
      );
      
      if (!canEdit) {
        socket.emit('error', { message: 'No edit permissions for this content' });
        return;
      }

      // Broadcast the changes to other users in the space
      socket.to(`space-${spaceId}`).emit('content-updated', {
        contentId,
        contentType,
        changes,
        editedBy: {
          userId: socket.userId,
          userName: socket.userName
        },
        timestamp: new Date()
      });

      // Store the changes for version control
      await CollaborationService.saveContentVersion(contentId, changes, socket.userId);

      console.log(`Content ${contentId} edited by ${socket.userName} in space ${spaceId}`);
    } catch (error) {
      console.error('Error handling content edit:', error);
      socket.emit('error', { message: 'Failed to save content changes' });
    }
  }

  async handleCursorUpdate(socket, { spaceId, contentId, position, selection }) {
    try {
      // Broadcast cursor position to other users editing the same content
      socket.to(`space-${spaceId}`).emit('cursor-updated', {
        contentId,
        user: {
          userId: socket.userId,
          userName: socket.userName
        },
        position,
        selection,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling cursor update:', error);
    }
  }

  async handleContentGeneration(socket, { spaceId, generationType, sourceData, options }) {
    try {
      // Verify user has permissions to generate content
      const canGenerate = await CollaborationService.checkUserSpacePermissions(
        socket.userId, 
        spaceId, 
        'edit'
      );
      
      if (!canGenerate) {
        socket.emit('error', { message: 'No permissions to generate content' });
        return;
      }

      // Notify other users that content generation has started
      socket.to(`space-${spaceId}`).emit('generation-started', {
        generationType,
        startedBy: {
          userId: socket.userId,
          userName: socket.userName
        },
        timestamp: new Date()
      });

      // Here you would integrate with your existing content generation logic
      // For now, we'll emit a placeholder
      socket.emit('generation-progress', {
        progress: 0,
        status: 'starting',
        message: 'Initializing content generation...'
      });

      console.log(`Content generation started by ${socket.userName} in space ${spaceId}`);
    } catch (error) {
      console.error('Error handling content generation:', error);
      socket.emit('error', { message: 'Failed to start content generation' });
    }
  }

  async handleTypingStart(socket, { spaceId, contentId }) {
    try {
      socket.to(`space-${spaceId}`).emit('user-typing', {
        contentId,
        user: {
          userId: socket.userId,
          userName: socket.userName
        },
        isTyping: true,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  }

  async handleTypingStop(socket, { spaceId, contentId }) {
    try {
      socket.to(`space-${spaceId}`).emit('user-typing', {
        contentId,
        user: {
          userId: socket.userId,
          userName: socket.userName
        },
        isTyping: false,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  }

  handleDisconnect(socket) {
    // Get user data before cleanup for notifications
    const userData = this.socketUsers.get(socket.id);
    const affectedSpaces = [];
    
    // Clean up socket mappings
    if (userData) {
      const userSocketSet = this.userSockets.get(userData.userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userData.userId);
        }
      }
    }
    this.socketUsers.delete(socket.id);

    // Clean up room memberships and collect affected spaces
    for (const [spaceId, socketSet] of this.collaborationRooms.entries()) {
      if (socketSet.has(socket.id)) {
        socketSet.delete(socket.id);
        affectedSpaces.push(spaceId);
        
        // Clean up empty rooms
        if (socketSet.size === 0) {
          this.collaborationRooms.delete(spaceId);
          this.clearSpaceCache(spaceId);
        } else {
          // Invalidate active users cache
          this.activeUsersCache.delete(spaceId);
        }
      }
    }

    // Make notifications async (non-blocking)
    setImmediate(() => {
      // Notify affected spaces about user leaving
      affectedSpaces.forEach(spaceId => {
        socket.to(`space-${spaceId}`).emit('user-left', {
          user: userData,
          timestamp: new Date()
        });
      });
      
      console.log(`User ${socket.userName} disconnected:`, socket.id);
    });
  }

  // Utility method to send notifications to specific users
  notifyUser(userId, event, data) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      });
    }
  }

  // Utility method to send notifications to all users in a space
  notifySpace(spaceId, event, data, excludeUserId = null) {
    try {
      const room = `space-${spaceId}`;
      if (excludeUserId) {
        const userSockets = this.userSockets.get(excludeUserId);
        if (userSockets) {
          userSockets.forEach(socketId => {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
              socket.to(room).emit(event, data);
            }
          });
        }
      } else {
        this.io.to(room).emit(event, data);
      }
    } catch (error) {
      console.error('Error notifying space:', error);
    }
  }

  // Performance monitoring methods
  getCacheStats() {
    return {
      permissionCache: {
        size: this.permissionCache.size
      },
      activeUsersCache: {
        size: this.activeUsersCache.size
      },
      activeConnections: this.socketUsers.size,
      activeRooms: this.collaborationRooms.size
    };
  }

  // Clear all caches (useful for debugging)
  clearAllCaches() {
    this.permissionCache.clear();
    this.activeUsersCache.clear();
    console.log('All caches cleared');
  }

  // Development mode: bypass all authentication for faster testing
  enableDevMode() {
    console.warn('🚨 DEVELOPMENT MODE: All authentication bypassed');
    this.io.use(async (socket, next) => {
      // Mock user data for development
      socket.userId = 'dev-user-' + Date.now();
      socket.userEmail = 'dev@test.com';
      socket.userName = 'Development User';
      next();
    });
  }

  // Get detailed performance metrics
  getPerformanceMetrics() {
    return {
      ...this.getCacheStats(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }
}

module.exports = SocketManager;
