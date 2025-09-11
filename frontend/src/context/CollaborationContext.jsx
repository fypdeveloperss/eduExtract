import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './FirebaseAuthContext';
import socketService from '../services/socketService';

const CollaborationContext = createContext();

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};

export const CollaborationProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [currentSpace, setCurrentSpace] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [contentLocks, setContentLocks] = useState(new Map());
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [cursorPositions, setCursorPositions] = useState(new Map());

  // ===== CONNECTION MANAGEMENT =====

  useEffect(() => {
    if (user) {
      connectToServer();
    } else {
      disconnectFromServer();
    }

    return () => {
      disconnectFromServer();
    };
  }, [user]);

  const connectToServer = useCallback(async () => {
    try {
      await socketService.connect(user);
      setIsConnected(true);
      setupEventListeners();
    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
      setIsConnected(false);
    }
  }, [user]);

  const disconnectFromServer = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setCurrentSpace(null);
    setActiveUsers([]);
    setContentLocks(new Map());
    setTypingUsers(new Map());
    setCursorPositions(new Map());
  }, []);

  // ===== SPACE MANAGEMENT =====

  const joinSpace = useCallback(async (spaceId) => {
    try {
      const spaceData = await socketService.joinSpace(spaceId);
      setCurrentSpace(spaceId);
      setActiveUsers(spaceData.activeUsers || []);
      return spaceData;
    } catch (error) {
      console.error('Failed to join collaboration space:', error);
      throw error;
    }
  }, []);

  const leaveSpace = useCallback(async () => {
    try {
      await socketService.leaveSpace();
      setCurrentSpace(null);
      setActiveUsers([]);
      setContentLocks(new Map());
      setTypingUsers(new Map());
      setCursorPositions(new Map());
    } catch (error) {
      console.error('Failed to leave collaboration space:', error);
    }
  }, []);

  // ===== REAL-TIME CONTENT EDITING =====

  const sendContentEdit = useCallback(async (contentId, changes, contentType) => {
    try {
      await socketService.sendContentEdit(contentId, changes, contentType);
    } catch (error) {
      console.error('Failed to send content edit:', error);
      throw error;
    }
  }, []);

  const sendCursorUpdate = useCallback(async (contentId, position, selection) => {
    try {
      await socketService.sendCursorUpdate(contentId, position, selection);
    } catch (error) {
      console.error('Failed to send cursor update:', error);
    }
  }, []);

  const startTyping = useCallback(async (contentId) => {
    try {
      await socketService.startTyping(contentId);
    } catch (error) {
      console.error('Failed to send typing start:', error);
    }
  }, []);

  const stopTyping = useCallback(async (contentId) => {
    try {
      await socketService.stopTyping(contentId);
    } catch (error) {
      console.error('Failed to send typing stop:', error);
    }
  }, []);

  const startContentGeneration = useCallback(async (generationType, sourceData, options) => {
    try {
      await socketService.startContentGeneration(generationType, sourceData, options);
    } catch (error) {
      console.error('Failed to start content generation:', error);
      throw error;
    }
  }, []);

  // ===== EVENT HANDLERS =====

  const setupEventListeners = useCallback(() => {
    // User presence events
    socketService.addEventListener('user-joined', (data) => {
      setActiveUsers(prev => {
        const existing = prev.find(u => u.userId === data.user.userId);
        if (existing) return prev;
        return [...prev, data.user];
      });
      
      addNotification({
        type: 'info',
        message: `${data.user.userName} joined the space`,
        timestamp: data.timestamp
      });
    });

    socketService.addEventListener('user-left', (data) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== data.user.userId));
      
      // Clear typing and cursor data for the user
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        for (const [key, value] of newMap.entries()) {
          if (value.userId === data.user.userId) {
            newMap.delete(key);
          }
        }
        return newMap;
      });

      setCursorPositions(prev => {
        const newMap = new Map(prev);
        for (const [key, value] of newMap.entries()) {
          if (value.userId === data.user.userId) {
            newMap.delete(key);
          }
        }
        return newMap;
      });

      addNotification({
        type: 'info',
        message: `${data.user.userName} left the space`,
        timestamp: data.timestamp
      });
    });

    // Content collaboration events
    socketService.addEventListener('content-updated', (data) => {
      // This will be handled by individual content components
      console.log('Content updated:', data);
    });

    socketService.addEventListener('cursor-updated', (data) => {
      setCursorPositions(prev => {
        const newMap = new Map(prev);
        const key = `${data.contentId}-${data.user.userId}`;
        newMap.set(key, {
          contentId: data.contentId,
          userId: data.user.userId,
          userName: data.user.userName,
          position: data.position,
          selection: data.selection,
          timestamp: data.timestamp
        });
        return newMap;
      });
    });

    socketService.addEventListener('user-typing', (data) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const key = `${data.contentId}-${data.user.userId}`;
        
        if (data.isTyping) {
          newMap.set(key, {
            contentId: data.contentId,
            userId: data.user.userId,
            userName: data.user.userName,
            timestamp: data.timestamp
          });
        } else {
          newMap.delete(key);
        }
        return newMap;
      });
    });

    // Content generation events
    socketService.addEventListener('generation-started', (data) => {
      addNotification({
        type: 'info',
        message: `${data.startedBy.userName} started generating content`,
        timestamp: data.timestamp
      });
    });

    // Change request events
    socketService.addEventListener('change-request-created', (data) => {
      addNotification({
        type: 'warning',
        message: `New change request: ${data.requestTitle}`,
        timestamp: data.timestamp,
        action: {
          label: 'Review',
          onClick: () => {
            // Navigate to change requests tab
            window.location.hash = '#requests';
          }
        }
      });
    });

    socketService.addEventListener('change-request-reviewed', (data) => {
      addNotification({
        type: data.status === 'approved' ? 'success' : 'error',
        message: `Change request ${data.status}: ${data.requestTitle}`,
        timestamp: data.timestamp
      });
    });

    socketService.addEventListener('change-request-applied', (data) => {
      addNotification({
        type: 'success',
        message: `Changes applied: ${data.requestTitle}`,
        timestamp: data.timestamp
      });
    });

    // Permission events
    socketService.addEventListener('permission-updated', (data) => {
      addNotification({
        type: 'info',
        message: `Your permission level has been updated to: ${data.newPermission}`,
        timestamp: data.timestamp
      });
    });

    socketService.addEventListener('member-permission-updated', (data) => {
      addNotification({
        type: 'info',
        message: `Member permission updated`,
        timestamp: data.timestamp
      });
    });

    // Content events
    socketService.addEventListener('content-created', (data) => {
      addNotification({
        type: 'success',
        message: `New ${data.contentType} created: ${data.contentTitle}`,
        timestamp: data.timestamp
      });
    });

    socketService.addEventListener('content-locked', (data) => {
      setContentLocks(prev => {
        const newMap = new Map(prev);
        newMap.set(data.contentId, {
          lockedBy: data.lockedBy,
          lockExpiry: data.lockExpiry,
          timestamp: data.timestamp
        });
        return newMap;
      });

      if (data.lockedBy !== user?.displayName) {
        addNotification({
          type: 'warning',
          message: `Content locked by ${data.lockedBy}: ${data.contentTitle}`,
          timestamp: data.timestamp
        });
      }
    });

    socketService.addEventListener('content-unlocked', (data) => {
      setContentLocks(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.contentId);
        return newMap;
      });

      addNotification({
        type: 'info',
        message: `Content unlocked: ${data.contentTitle}`,
        timestamp: data.timestamp
      });
    });

    // Space events
    socketService.addEventListener('space-updated', (data) => {
      addNotification({
        type: 'info',
        message: `Space updated by ${data.updatedBy}`,
        timestamp: data.timestamp
      });
    });

    socketService.addEventListener('member-added', (data) => {
      setActiveUsers(prev => {
        const existing = prev.find(u => u.userEmail === data.newMember.email);
        if (existing) return prev;
        return [...prev, {
          userId: data.newMember.userId || Date.now().toString(),
          userName: data.newMember.name,
          userEmail: data.newMember.email
        }];
      });

      addNotification({
        type: 'success',
        message: `${data.newMember.name} joined the space`,
        timestamp: data.timestamp
      });
    });

    // Version control events
    socketService.addEventListener('content-version-saved', (data) => {
      addNotification({
        type: 'info',
        message: `Content version ${data.version} saved by ${data.modifiedBy.name}`,
        timestamp: data.timestamp
      });
    });

    // Error handling
    socketService.addEventListener('error', (error) => {
      addNotification({
        type: 'error',
        message: error.message || 'Collaboration error occurred',
        timestamp: new Date()
      });
    });
  }, [user]);

  // ===== NOTIFICATION MANAGEMENT =====

  const addNotification = useCallback((notification) => {
    const notificationWithId = {
      ...notification,
      id: Date.now() + Math.random(),
      timestamp: notification.timestamp || new Date()
    };

    setNotifications(prev => [notificationWithId, ...prev].slice(0, 50)); // Keep only last 50

    // Auto-remove info notifications after 5 seconds
    if (notification.type === 'info') {
      setTimeout(() => {
        removeNotification(notificationWithId.id);
      }, 5000);
    }
  }, []);

  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // ===== UTILITY FUNCTIONS =====

  const getTypingUsersForContent = useCallback((contentId) => {
    const typingForContent = [];
    for (const [key, value] of typingUsers.entries()) {
      if (value.contentId === contentId && value.userId !== user?.uid) {
        typingForContent.push(value);
      }
    }
    return typingForContent;
  }, [typingUsers, user]);

  const getCursorPositionsForContent = useCallback((contentId) => {
    const cursorsForContent = [];
    for (const [key, value] of cursorPositions.entries()) {
      if (value.contentId === contentId && value.userId !== user?.uid) {
        cursorsForContent.push(value);
      }
    }
    return cursorsForContent;
  }, [cursorPositions, user]);

  const isContentLocked = useCallback((contentId) => {
    const lock = contentLocks.get(contentId);
    if (!lock) return false;
    
    // Check if lock has expired
    if (lock.lockExpiry && new Date(lock.lockExpiry) < new Date()) {
      setContentLocks(prev => {
        const newMap = new Map(prev);
        newMap.delete(contentId);
        return newMap;
      });
      return false;
    }
    
    return true;
  }, [contentLocks]);

  const getContentLockInfo = useCallback((contentId) => {
    return contentLocks.get(contentId) || null;
  }, [contentLocks]);

  // ===== CONTEXT VALUE =====

  const value = {
    // Connection state
    isConnected,
    currentSpace,
    activeUsers,
    
    // Space management
    joinSpace,
    leaveSpace,
    
    // Real-time editing
    sendContentEdit,
    sendCursorUpdate,
    startTyping,
    stopTyping,
    startContentGeneration,
    
    // Notifications
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    
    // Content collaboration
    getTypingUsersForContent,
    getCursorPositionsForContent,
    isContentLocked,
    getContentLockInfo,
    
    // Connection utilities
    connectToServer,
    disconnectFromServer
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

export default CollaborationContext;
