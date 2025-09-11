const ChangeRequest = require('../models/ChangeRequest');
const SharedContent = require('../models/SharedContent');
const CollaborationSpace = require('../models/CollaborationSpace');
const CollaborationService = require('./collaborationService');
const SharedContentService = require('./sharedContentService');

class ChangeRequestService {
  // ===== CHANGE REQUEST MANAGEMENT =====

  async createChangeRequest(requestData, userId, userName) {
    try {
      const { sharedContentId, collaborationSpaceId } = requestData;

      // Verify the content exists
      const content = await SharedContent.findById(sharedContentId);
      if (!content) {
        throw new Error('Content not found');
      }

      // Verify user has access to the collaboration space
      const space = await CollaborationService.getCollaborationSpaceById(collaborationSpaceId, userId);

      // Check if user can create change requests
      if (!CollaborationService.canUserPerformAction(space, userId, 'edit_content')) {
        throw new Error('Permission denied: You cannot create change requests in this space');
      }

      // Check for existing pending change request for this content by this user
      const existingRequest = await ChangeRequest.findOne({
        sharedContentId,
        requestedBy: userId,
        status: 'pending'
      });

      if (existingRequest) {
        throw new Error('You already have a pending change request for this content');
      }

      const changeRequest = new ChangeRequest({
        ...requestData,
        requestedBy: userId,
        requestedByName: userName,
        originalContent: content.content, // Store current content for comparison
        metadata: {
          ipAddress: requestData.metadata?.ipAddress,
          userAgent: requestData.metadata?.userAgent,
          platform: requestData.metadata?.platform
        }
      });

      await changeRequest.save();

      // Update space last activity
      await CollaborationSpace.findByIdAndUpdate(
        collaborationSpaceId,
        { $set: { 'stats.lastActivity': new Date() } }
      );

      return changeRequest;
    } catch (error) {
      throw new Error(`Failed to create change request: ${error.message}`);
    }
  }

  async getChangeRequests(collaborationSpaceId, userId, page = 1, limit = 20, filters = {}) {
    try {
      // Verify user has access to the collaboration space
      await CollaborationService.getCollaborationSpaceById(collaborationSpaceId, userId);

      const skip = (page - 1) * limit;
      let query = { collaborationSpaceId };

      // Add filters
      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.requestType) {
        query.requestType = filters.requestType;
      }

      if (filters.priority) {
        query.priority = filters.priority;
      }

      if (filters.requestedBy) {
        query.requestedBy = filters.requestedBy;
      }

      // If user is not admin, only show their requests and requests they can review
      const userPermission = CollaborationService.getUserPermission(
        await CollaborationSpace.findById(collaborationSpaceId), 
        userId
      );

      if (userPermission !== 'admin') {
        query.$or = [
          { requestedBy: userId },
          { reviewedBy: userId }
        ];
      }

      const requests = await ChangeRequest.find(query)
        .sort({ priority: 1, createdAt: -1 }) // urgent first, then by date
        .skip(skip)
        .limit(limit)
        .populate('sharedContentId', 'title contentType')
        .lean();

      const total = await ChangeRequest.countDocuments(query);

      return {
        requests,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get change requests: ${error.message}`);
    }
  }

  async getChangeRequestById(requestId, userId) {
    try {
      const request = await ChangeRequest.findById(requestId)
        .populate('sharedContentId', 'title contentType status')
        .populate('collaborationSpaceId', 'title');

      if (!request) {
        throw new Error('Change request not found');
      }

      // Verify user has access to the collaboration space
      const space = await CollaborationService.getCollaborationSpaceById(request.collaborationSpaceId._id, userId);

      // Check if user can view this request
      const userPermission = CollaborationService.getUserPermission(space, userId);
      const canView = userPermission === 'admin' || 
                     request.requestedBy === userId || 
                     request.reviewedBy === userId;

      if (!canView) {
        throw new Error('Permission denied: You cannot view this change request');
      }

      return request;
    } catch (error) {
      throw new Error(`Failed to get change request: ${error.message}`);
    }
  }

  async updateChangeRequest(requestId, updateData, userId) {
    try {
      const request = await ChangeRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Change request not found');
      }

      // Only the requester can update a pending request
      if (request.requestedBy !== userId) {
        throw new Error('Permission denied: Only the requester can update this change request');
      }

      if (request.status !== 'pending') {
        throw new Error('Cannot update a change request that has been reviewed');
      }

      // Update allowed fields
      const allowedFields = ['title', 'description', 'proposedContent', 'priority', 'attachments'];
      const filteredUpdate = {};
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          filteredUpdate[field] = updateData[field];
        }
      });

      Object.assign(request, filteredUpdate);
      await request.save();

      return request;
    } catch (error) {
      throw new Error(`Failed to update change request: ${error.message}`);
    }
  }

  async reviewChangeRequest(requestId, reviewData, reviewerId, reviewerName) {
    try {
      const { status, reviewComments, applyChanges = false } = reviewData;

      const request = await ChangeRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Change request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Change request has already been reviewed');
      }

      // Verify user has permission to review
      const space = await CollaborationService.getCollaborationSpaceById(request.collaborationSpaceId, reviewerId);
      
      if (!CollaborationService.canUserPerformAction(space, reviewerId, 'approve_changes')) {
        throw new Error('Permission denied: You cannot review change requests');
      }

      // Cannot review own request
      if (request.requestedBy === reviewerId) {
        throw new Error('You cannot review your own change request');
      }

      // Update request
      request.status = status;
      request.reviewedBy = reviewerId;
      request.reviewedByName = reviewerName;
      request.reviewComments = reviewComments || '';
      request.reviewedAt = new Date();

      await request.save();

      // If approved and applyChanges is true, apply the changes to the content
      if (status === 'approved' && applyChanges) {
        await this.applyChangeRequest(requestId, reviewerId);
      }

      // Update space last activity
      await CollaborationSpace.findByIdAndUpdate(
        request.collaborationSpaceId,
        { $set: { 'stats.lastActivity': new Date() } }
      );

      return request;
    } catch (error) {
      throw new Error(`Failed to review change request: ${error.message}`);
    }
  }

  async applyChangeRequest(requestId, applierId) {
    try {
      const request = await ChangeRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Change request not found');
      }

      if (request.status !== 'approved') {
        throw new Error('Only approved change requests can be applied');
      }

      // Verify user has permission to apply changes
      const space = await CollaborationService.getCollaborationSpaceById(request.collaborationSpaceId, applierId);
      
      if (!CollaborationService.canUserPerformAction(space, applierId, 'approve_changes')) {
        throw new Error('Permission denied: You cannot apply changes');
      }

      const content = await SharedContent.findById(request.sharedContentId);
      
      if (!content) {
        throw new Error('Content not found');
      }

      // Apply changes based on request type
      switch (request.requestType) {
        case 'content_edit':
          // Update content with proposed changes
          if (request.proposedContent.title) {
            content.title = request.proposedContent.title;
          }
          if (request.proposedContent.content) {
            content.content = request.proposedContent.content;
          }
          if (request.proposedContent.tags) {
            content.tags = request.proposedContent.tags;
          }
          
          content.lastModifiedBy = applierId;
          content.lastModifiedByName = request.reviewedByName || 'Admin';
          content.version = content.version + 1;
          break;

        case 'permission_change':
          // Apply permission changes
          if (request.proposedContent.permissions) {
            Object.assign(content.permissions, request.proposedContent.permissions);
          }
          break;

        case 'structure_change':
          // Apply structural changes
          if (request.proposedContent.contentType) {
            content.contentType = request.proposedContent.contentType;
          }
          break;

        default:
          throw new Error(`Unsupported change request type: ${request.requestType}`);
      }

      await content.save();

      // Mark request as applied
      request.status = 'applied';
      await request.save();

      return {
        message: 'Change request applied successfully',
        updatedContent: content
      };
    } catch (error) {
      throw new Error(`Failed to apply change request: ${error.message}`);
    }
  }

  async addCommentToChangeRequest(requestId, commentData, userId, userName) {
    try {
      const request = await ChangeRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Change request not found');
      }

      // Verify user has access to view the request
      const space = await CollaborationService.getCollaborationSpaceById(request.collaborationSpaceId, userId);
      const userPermission = CollaborationService.getUserPermission(space, userId);
      const canComment = userPermission === 'admin' || 
                        request.requestedBy === userId || 
                        request.reviewedBy === userId ||
                        CollaborationService.canUserPerformAction(space, userId, 'comment');

      if (!canComment) {
        throw new Error('Permission denied: You cannot comment on this change request');
      }

      // Add comment
      request.comments.push({
        userId,
        userName,
        content: commentData.content,
        createdAt: new Date()
      });

      await request.save();

      return request;
    } catch (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }

  async deleteChangeRequest(requestId, userId) {
    try {
      const request = await ChangeRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Change request not found');
      }

      // Only the requester or admin can delete
      const space = await CollaborationService.getCollaborationSpaceById(request.collaborationSpaceId, userId);
      const userPermission = CollaborationService.getUserPermission(space, userId);
      const canDelete = request.requestedBy === userId || userPermission === 'admin';

      if (!canDelete) {
        throw new Error('Permission denied: You cannot delete this change request');
      }

      // Can only delete pending or rejected requests
      if (request.status === 'approved' || request.status === 'applied') {
        throw new Error('Cannot delete approved or applied change requests');
      }

      await ChangeRequest.findByIdAndDelete(requestId);

      return { message: 'Change request deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete change request: ${error.message}`);
    }
  }

  // ===== ANALYTICS AND REPORTING =====

  async getChangeRequestStats(collaborationSpaceId, userId) {
    try {
      // Verify user has access to the collaboration space
      await CollaborationService.getCollaborationSpaceById(collaborationSpaceId, userId);

      const stats = await ChangeRequest.aggregate([
        { $match: { collaborationSpaceId: collaborationSpaceId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const priorityStats = await ChangeRequest.aggregate([
        { $match: { collaborationSpaceId: collaborationSpaceId, status: 'pending' } },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      const typeStats = await ChangeRequest.aggregate([
        { $match: { collaborationSpaceId: collaborationSpaceId } },
        {
          $group: {
            _id: '$requestType',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        byStatus: stats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPriority: priorityStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byType: typeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };
    } catch (error) {
      throw new Error(`Failed to get change request stats: ${error.message}`);
    }
  }

  // ===== USER-SPECIFIC REQUESTS =====

  async getUserChangeRequests(userId, page = 1, limit = 20, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      let query = { requestedBy: userId };

      // Add filters
      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.collaborationSpaceId) {
        query.collaborationSpaceId = filters.collaborationSpaceId;
      }

      const requests = await ChangeRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sharedContentId', 'title contentType')
        .populate('collaborationSpaceId', 'title')
        .lean();

      const total = await ChangeRequest.countDocuments(query);

      return {
        requests,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get user change requests: ${error.message}`);
    }
  }

  async getPendingReviewRequests(userId, page = 1, limit = 20) {
    try {
      // Get collaboration spaces where user can approve changes
      const userSpaces = await CollaborationService.getUserCollaborationSpaces(userId, 1, 1000);
      const adminSpaceIds = userSpaces.spaces
        .filter(space => 
          space.ownerId === userId || 
          space.collaborators.some(c => c.userId === userId && c.permission === 'admin')
        )
        .map(space => space._id);

      if (adminSpaceIds.length === 0) {
        return { requests: [], pagination: { currentPage: 1, totalPages: 0, totalCount: 0 } };
      }

      const skip = (page - 1) * limit;
      
      const query = {
        collaborationSpaceId: { $in: adminSpaceIds },
        status: 'pending',
        requestedBy: { $ne: userId } // Don't include own requests
      };

      const requests = await ChangeRequest.find(query)
        .sort({ priority: 1, createdAt: 1 }) // urgent first, oldest first
        .skip(skip)
        .limit(limit)
        .populate('sharedContentId', 'title contentType')
        .populate('collaborationSpaceId', 'title')
        .lean();

      const total = await ChangeRequest.countDocuments(query);

      return {
        requests,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCount: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get pending review requests: ${error.message}`);
    }
  }
}

module.exports = new ChangeRequestService();
