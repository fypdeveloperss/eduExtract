const { Server } = require('socket.io');
const { verifyToken } = require('../middleware/auth');
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

    this.setupSocketHandlers();
  }

  setCollaborationService(collaborationService) {
    this.collaborationService = collaborationService;
  }

  setupSocketHandlers() {
    // Authentication middleware for socket connections
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        // Verify the Firebase token
        const admin = require('firebase-admin');
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        socket.userId = decodedToken.uid;
        socket.userEmail = decodedToken.email;
        socket.userName = decodedToken.name || decodedToken.email;
        
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
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

      // Verify user has access to this space
      const hasAccess = await this.collaborationService.checkUserSpaceAccess(socket.userId, spaceId);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to collaboration space' });
        return;
      }

      // Join the socket room
      socket.join(`space-${spaceId}`);
      
      // Track the room membership
      if (!this.collaborationRooms.has(spaceId)) {
        this.collaborationRooms.set(spaceId, new Set());
      }
      this.collaborationRooms.get(spaceId).add(socket.id);

      // Get current active users in the space
      const activeUsers = Array.from(this.collaborationRooms.get(spaceId))
        .map(socketId => this.socketUsers.get(socketId))
        .filter(user => user);

      // Notify other users in the space
      socket.to(`space-${spaceId}`).emit('user-joined', {
        user: {
          userId: socket.userId,
          userName: socket.userName,
          userEmail: socket.userEmail
        },
        timestamp: new Date()
      });

      // Send current active users to the joining user
      socket.emit('space-joined', {
        spaceId,
        activeUsers,
        timestamp: new Date()
      });

      console.log(`User ${socket.userName} joined space ${spaceId}`);
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
        }
      }

      // Notify other users in the space
      socket.to(`space-${spaceId}`).emit('user-left', {
        user: {
          userId: socket.userId,
          userName: socket.userName
        },
        timestamp: new Date()
      });

      console.log(`User ${socket.userName} left space ${spaceId}`);
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
    console.log(`User ${socket.userName} disconnected:`, socket.id);
    
    // Clean up socket mappings
    const userData = this.socketUsers.get(socket.id);
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

    // Clean up room memberships
    for (const [spaceId, socketSet] of this.collaborationRooms.entries()) {
      if (socketSet.has(socket.id)) {
        socketSet.delete(socket.id);
        
        // Notify other users in the space
        socket.to(`space-${spaceId}`).emit('user-left', {
          user: userData,
          timestamp: new Date()
        });
        
        // Clean up empty rooms
        if (socketSet.size === 0) {
          this.collaborationRooms.delete(spaceId);
        }
      }
    }
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
  }
}

module.exports = SocketManager;
