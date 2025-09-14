import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentSpaceId = null;
    this.listeners = new Map();
  }

  // ===== CONNECTION MANAGEMENT =====

  async connect(user) {
    if (this.socket?.connected) {
      return this.socket;
    }

    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
      
      this.socket = io(serverUrl, {
        auth: {
          userId: user.uid,
          userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          userEmail: user.email
        },
        transports: ['websocket', 'polling']
      });

      // Setup connection event handlers
      this.socket.on('connect', () => {
        console.log('Connected to collaboration server');
        this.isConnected = true;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from collaboration server:', reason);
        this.isConnected = false;
        
        // Attempt to reconnect if needed
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          setTimeout(() => this.connect(user), 5000);
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.isConnected = false;
      });

      // Setup default event handlers
      this.setupDefaultHandlers();

      return this.socket;
    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentSpaceId = null;
    }
  }

  // ===== SPACE MANAGEMENT =====

  async joinSpace(spaceId) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to collaboration server');
    }

    // Leave current space if any
    if (this.currentSpaceId && this.currentSpaceId !== spaceId) {
      await this.leaveSpace();
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('join-space', { spaceId });
      
      this.socket.once('space-joined', (data) => {
        this.currentSpaceId = spaceId;
        console.log(`Joined collaboration space: ${spaceId}`);
        resolve(data);
      });

      this.socket.once('error', (error) => {
        console.error('Failed to join space:', error);
        reject(new Error(error.message));
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Timeout joining collaboration space'));
      }, 10000);
    });
  }

  async leaveSpace() {
    if (!this.socket || !this.currentSpaceId) {
      return;
    }

    return new Promise((resolve) => {
      this.socket.emit('leave-space', { spaceId: this.currentSpaceId });
      this.currentSpaceId = null;
      console.log('Left collaboration space');
      resolve();
    });
  }

  // ===== REAL-TIME CONTENT EDITING =====

  async sendContentEdit(contentId, changes, contentType) {
    if (!this.socket || !this.currentSpaceId) {
      throw new Error('Not connected to a collaboration space');
    }

    this.socket.emit('content-edit', {
      spaceId: this.currentSpaceId,
      contentId,
      changes,
      contentType
    });
  }

  async sendCursorUpdate(contentId, position, selection) {
    if (!this.socket || !this.currentSpaceId) {
      return;
    }

    this.socket.emit('cursor-update', {
      spaceId: this.currentSpaceId,
      contentId,
      position,
      selection
    });
  }

  async startTyping(contentId) {
    if (!this.socket || !this.currentSpaceId) {
      return;
    }

    this.socket.emit('typing-start', {
      spaceId: this.currentSpaceId,
      contentId
    });
  }

  async stopTyping(contentId) {
    if (!this.socket || !this.currentSpaceId) {
      return;
    }

    this.socket.emit('typing-stop', {
      spaceId: this.currentSpaceId,
      contentId
    });
  }

  async startContentGeneration(generationType, sourceData, options) {
    if (!this.socket || !this.currentSpaceId) {
      throw new Error('Not connected to a collaboration space');
    }

    this.socket.emit('content-generation', {
      spaceId: this.currentSpaceId,
      generationType,
      sourceData,
      options
    });
  }

  // ===== EVENT LISTENERS =====

  setupDefaultHandlers() {
    if (!this.socket) return;

    // User presence events
    this.socket.on('user-joined', (data) => {
      console.log('User joined space:', data.user.userName);
      this.emitToListeners('user-joined', data);
    });

    this.socket.on('user-left', (data) => {
      console.log('User left space:', data.user.userName);
      this.emitToListeners('user-left', data);
    });

    // Content collaboration events
    this.socket.on('content-updated', (data) => {
      console.log('Content updated:', data.contentId);
      this.emitToListeners('content-updated', data);
    });

    this.socket.on('cursor-updated', (data) => {
      this.emitToListeners('cursor-updated', data);
    });

    this.socket.on('user-typing', (data) => {
      this.emitToListeners('user-typing', data);
    });

    // Content generation events
    this.socket.on('generation-started', (data) => {
      console.log('Content generation started by:', data.startedBy.userName);
      this.emitToListeners('generation-started', data);
    });

    this.socket.on('generation-progress', (data) => {
      this.emitToListeners('generation-progress', data);
    });

    // Change request events
    this.socket.on('change-request-created', (data) => {
      console.log('New change request:', data.requestTitle);
      this.emitToListeners('change-request-created', data);
    });

    this.socket.on('change-request-reviewed', (data) => {
      console.log('Change request reviewed:', data.requestTitle);
      this.emitToListeners('change-request-reviewed', data);
    });

    this.socket.on('change-request-applied', (data) => {
      console.log('Change request applied:', data.requestTitle);
      this.emitToListeners('change-request-applied', data);
    });

    // Permission events
    this.socket.on('permission-updated', (data) => {
      console.log('Permission updated:', data.newPermission);
      this.emitToListeners('permission-updated', data);
    });

    this.socket.on('member-permission-updated', (data) => {
      console.log('Member permission updated');
      this.emitToListeners('member-permission-updated', data);
    });

    // Content events
    this.socket.on('content-created', (data) => {
      console.log('New content created:', data.contentTitle);
      this.emitToListeners('content-created', data);
    });

    this.socket.on('content-locked', (data) => {
      console.log('Content locked:', data.contentTitle);
      this.emitToListeners('content-locked', data);
    });

    this.socket.on('content-unlocked', (data) => {
      console.log('Content unlocked:', data.contentTitle);
      this.emitToListeners('content-unlocked', data);
    });

    // Space events
    this.socket.on('space-updated', (data) => {
      console.log('Space updated:', data.spaceName);
      this.emitToListeners('space-updated', data);
    });

    this.socket.on('member-added', (data) => {
      console.log('Member added:', data.newMember.name);
      this.emitToListeners('member-added', data);
    });

    // Version control events
    this.socket.on('content-version-saved', (data) => {
      console.log('Content version saved:', data.version);
      this.emitToListeners('content-version-saved', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emitToListeners('error', error);
    });
  }

  // ===== LISTENER MANAGEMENT =====

  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emitToListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // ===== UTILITY METHODS =====

  isConnectedToSpace(spaceId) {
    return this.isConnected && this.currentSpaceId === spaceId;
  }

  getCurrentSpaceId() {
    return this.currentSpaceId;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      currentSpaceId: this.currentSpaceId,
      hasSocket: !!this.socket
    };
  }
}

// Create and export a singleton instance
const socketService = new SocketService();
export default socketService;
