const ChangeRequest = require('../models/ChangeRequest');
const CollaborationSpace = require('../models/CollaborationSpace');
const User = require('../models/User');

class NotificationService {
  constructor() {
    this.socketManager = null;
  }

  setSocketManager(socketManager) {
    this.socketManager = socketManager;
  }

  // ===== CHANGE REQUEST NOTIFICATIONS =====

  async notifyChangeRequestCreated(changeRequest) {
    try {
      const space = await CollaborationSpace.findById(changeRequest.collaborationSpaceId);
      if (!space) return;

      // Get all space admins (they can approve changes)
      const admins = space.collaborators.filter(c => 
        c.status === 'active' && 
        (c.permission === 'admin' || c.userId === space.ownerId)
      );

      // Create notification data
      const notificationData = {
        type: 'change_request_created',
        requestId: changeRequest._id,
        spaceId: space._id,
        spaceName: space.title,
        requestTitle: changeRequest.title,
        requestedBy: changeRequest.requestedByName,
        priority: changeRequest.priority,
        urgency: changeRequest.urgency,
        timestamp: new Date()
      };

      // Notify all admins
      for (const admin of admins) {
        if (admin.userId !== changeRequest.requestedBy) { // Don't notify the requester
          if (this.socketManager) {
            this.socketManager.notifyUser(admin.userId, 'change-request-created', notificationData);
          }
        }
      }

      // Update notification flag
      changeRequest.notifications.requestCreated = true;
      await changeRequest.save();

      console.log(`Change request ${changeRequest._id} notifications sent to ${admins.length} admins`);
    } catch (error) {
      console.error('Error notifying change request created:', error);
    }
  }

  async notifyChangeRequestReviewed(changeRequest, reviewer) {
    try {
      const space = await CollaborationSpace.findById(changeRequest.collaborationSpaceId);
      if (!space) return;

      const notificationData = {
        type: 'change_request_reviewed',
        requestId: changeRequest._id,
        spaceId: space._id,
        spaceName: space.title,
        requestTitle: changeRequest.title,
        status: changeRequest.status,
        reviewedBy: reviewer.name,
        reviewComment: changeRequest.reviewComments,
        timestamp: new Date()
      };

      // Notify the original requester
      if (this.socketManager) {
        this.socketManager.notifyUser(changeRequest.requestedBy, 'change-request-reviewed', notificationData);
      }

      // Notify watchers
      for (const watcher of changeRequest.watchers || []) {
        if (watcher.userId !== changeRequest.requestedBy && watcher.userId !== reviewer.id) {
          if (this.socketManager) {
            this.socketManager.notifyUser(watcher.userId, 'change-request-reviewed', notificationData);
          }
        }
      }

      // Update notification flag
      changeRequest.notifications.reviewCompleted = true;
      await changeRequest.save();

      console.log(`Change request ${changeRequest._id} review notifications sent`);
    } catch (error) {
      console.error('Error notifying change request reviewed:', error);
    }
  }

  async notifyChangeRequestApplied(changeRequest, appliedBy) {
    try {
      const space = await CollaborationSpace.findById(changeRequest.collaborationSpaceId);
      if (!space) return;

      const notificationData = {
        type: 'change_request_applied',
        requestId: changeRequest._id,
        spaceId: space._id,
        spaceName: space.title,
        requestTitle: changeRequest.title,
        appliedBy: appliedBy.name,
        timestamp: new Date()
      };

      // Notify all space members
      const activeMembers = space.collaborators.filter(c => c.status === 'active');
      
      for (const member of activeMembers) {
        if (this.socketManager) {
          this.socketManager.notifyUser(member.userId, 'change-request-applied', notificationData);
        }
      }

      // Notify space via socket room
      if (this.socketManager) {
        this.socketManager.notifySpace(space._id.toString(), 'change-applied', notificationData);
      }

      // Update notification flag
      changeRequest.notifications.changesApplied = true;
      await changeRequest.save();

      console.log(`Change request ${changeRequest._id} applied notifications sent to ${activeMembers.length} members`);
    } catch (error) {
      console.error('Error notifying change request applied:', error);
    }
  }

  // ===== COLLABORATION SPACE NOTIFICATIONS =====

  async notifySpaceUpdated(spaceId, updateType, updatedBy, changes) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      if (!space) return;

      const notificationData = {
        type: 'space_updated',
        spaceId: space._id,
        spaceName: space.title,
        updateType,
        updatedBy: updatedBy.name,
        changes,
        timestamp: new Date()
      };

      // Notify all space members except the one who made the change
      const activeMembers = space.collaborators.filter(c => 
        c.status === 'active' && c.userId !== updatedBy.id
      );

      for (const member of activeMembers) {
        if (this.socketManager) {
          this.socketManager.notifyUser(member.userId, 'space-updated', notificationData);
        }
      }

      console.log(`Space ${spaceId} update notifications sent to ${activeMembers.length} members`);
    } catch (error) {
      console.error('Error notifying space updated:', error);
    }
  }

  async notifyMemberAdded(spaceId, newMember, addedBy) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      if (!space) return;

      const notificationData = {
        type: 'member_added',
        spaceId: space._id,
        spaceName: space.title,
        newMember: {
          name: newMember.name,
          email: newMember.email,
          permission: newMember.permission
        },
        addedBy: addedBy.name,
        timestamp: new Date()
      };

      // Notify all space members except the new member and the one who added them
      const activeMembers = space.collaborators.filter(c => 
        c.status === 'active' && 
        c.userId !== newMember.userId && 
        c.userId !== addedBy.id
      );

      for (const member of activeMembers) {
        if (this.socketManager) {
          this.socketManager.notifyUser(member.userId, 'member-added', notificationData);
        }
      }

      // Also notify via space room
      if (this.socketManager) {
        this.socketManager.notifySpace(spaceId, 'member-added', notificationData, newMember.userId);
      }

      console.log(`Member added notifications sent to ${activeMembers.length} members`);
    } catch (error) {
      console.error('Error notifying member added:', error);
    }
  }

  async notifyPermissionChanged(spaceId, targetMember, newPermission, changedBy) {
    try {
      const space = await CollaborationSpace.findById(spaceId);
      if (!space) return;

      const notificationData = {
        type: 'permission_changed',
        spaceId: space._id,
        spaceName: space.title,
        targetMember: {
          name: targetMember.name,
          email: targetMember.email,
          oldPermission: targetMember.oldPermission,
          newPermission: newPermission
        },
        changedBy: changedBy.name,
        timestamp: new Date()
      };

      // Notify the target member
      if (this.socketManager) {
        this.socketManager.notifyUser(targetMember.userId, 'permission-changed', notificationData);
      }

      // Notify other space admins
      const admins = space.collaborators.filter(c => 
        c.status === 'active' && 
        c.permission === 'admin' && 
        c.userId !== changedBy.id && 
        c.userId !== targetMember.userId
      );

      for (const admin of admins) {
        if (this.socketManager) {
          this.socketManager.notifyUser(admin.userId, 'permission-changed', notificationData);
        }
      }

      console.log(`Permission change notifications sent`);
    } catch (error) {
      console.error('Error notifying permission changed:', error);
    }
  }

  // ===== CONTENT NOTIFICATIONS =====

  async notifyContentCreated(content, creator) {
    try {
      const space = await CollaborationSpace.findById(content.collaborationSpaceId);
      if (!space) return;

      const notificationData = {
        type: 'content_created',
        contentId: content._id,
        contentTitle: content.title,
        contentType: content.contentType,
        spaceId: space._id,
        spaceName: space.title,
        createdBy: creator.name,
        timestamp: new Date()
      };

      // Notify all space members except the creator
      const activeMembers = space.collaborators.filter(c => 
        c.status === 'active' && c.userId !== creator.id
      );

      for (const member of activeMembers) {
        if (this.socketManager) {
          this.socketManager.notifyUser(member.userId, 'content-created', notificationData);
        }
      }

      // Also notify via space room
      if (this.socketManager) {
        this.socketManager.notifySpace(space._id.toString(), 'content-created', notificationData, creator.id);
      }

      console.log(`Content creation notifications sent to ${activeMembers.length} members`);
    } catch (error) {
      console.error('Error notifying content created:', error);
    }
  }

  async notifyContentLocked(content, lockedBy) {
    try {
      const space = await CollaborationSpace.findById(content.collaborationSpaceId);
      if (!space) return;

      const notificationData = {
        type: 'content_locked',
        contentId: content._id,
        contentTitle: content.title,
        spaceId: space._id,
        spaceName: space.title,
        lockedBy: lockedBy.name,
        lockExpiry: content.lockExpiry,
        timestamp: new Date()
      };

      // Notify via space room
      if (this.socketManager) {
        this.socketManager.notifySpace(space._id.toString(), 'content-locked', notificationData, lockedBy.id);
      }

      console.log(`Content lock notifications sent for content ${content._id}`);
    } catch (error) {
      console.error('Error notifying content locked:', error);
    }
  }

  async notifyContentUnlocked(content, unlockedBy) {
    try {
      const space = await CollaborationSpace.findById(content.collaborationSpaceId);
      if (!space) return;

      const notificationData = {
        type: 'content_unlocked',
        contentId: content._id,
        contentTitle: content.title,
        spaceId: space._id,
        spaceName: space.title,
        unlockedBy: unlockedBy ? unlockedBy.name : 'System (expired)',
        timestamp: new Date()
      };

      // Notify via space room
      if (this.socketManager) {
        this.socketManager.notifySpace(space._id.toString(), 'content-unlocked', notificationData, unlockedBy?.id);
      }

      console.log(`Content unlock notifications sent for content ${content._id}`);
    } catch (error) {
      console.error('Error notifying content unlocked:', error);
    }
  }

  // ===== UTILITY METHODS =====

  async addWatcher(changeRequestId, userId, userName) {
    try {
      const changeRequest = await ChangeRequest.findById(changeRequestId);
      if (!changeRequest) return;

      // Check if user is already watching
      const existingWatcher = changeRequest.watchers?.find(w => w.userId === userId);
      if (existingWatcher) return;

      // Add watcher
      if (!changeRequest.watchers) {
        changeRequest.watchers = [];
      }
      
      changeRequest.watchers.push({
        userId,
        userName,
        watchingSince: new Date()
      });

      await changeRequest.save();
      console.log(`User ${userName} is now watching change request ${changeRequestId}`);
    } catch (error) {
      console.error('Error adding watcher:', error);
    }
  }

  async removeWatcher(changeRequestId, userId) {
    try {
      const changeRequest = await ChangeRequest.findById(changeRequestId);
      if (!changeRequest) return;

      // Remove watcher
      changeRequest.watchers = changeRequest.watchers?.filter(w => w.userId !== userId) || [];
      
      await changeRequest.save();
      console.log(`User ${userId} stopped watching change request ${changeRequestId}`);
    } catch (error) {
      console.error('Error removing watcher:', error);
    }
  }
}

module.exports = new NotificationService();
