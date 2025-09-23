const ChangeRequest = require('../models/ChangeRequest');
const SharedContent = require('../models/SharedContent');
const CollaborationSpace = require('../models/CollaborationSpace');
const SharedContentService = require('./sharedContentService');

class ChangeRequestService {
  // ===== HELPER METHODS =====

  async verifySpaceAccess(collaborationSpaceId, userId) {
    const space = await CollaborationSpace.findById(collaborationSpaceId);
    if (!space) {
      throw new Error('Collaboration space not found');
    }

    // Check if user is a collaborator in the space
    const isCollaborator = space.collaborators.some(
      collaborator => collaborator.userId === userId && collaborator.status === 'active'
    );

    if (!isCollaborator) {
      throw new Error('Access denied: You are not a collaborator in this space');
    }

    return space;
  }

  getUserPermission(space, userId) {
    const collaborator = space.collaborators.find(
      collaborator => collaborator.userId === userId && collaborator.status === 'active'
    );
    return collaborator ? collaborator.permission : null;
  }

  canUserPerformAction(space, userId, action) {
    const userPermission = this.getUserPermission(space, userId);
    
    // Admin can do everything
    if (userPermission === 'admin') {
      return true;
    }
    
    // Owner-specific actions
    if (space.ownerId === userId) {
      return true;
    }
    
    // Editor permissions
    if (userPermission === 'editor') {
      return ['edit_content', 'comment', 'create_changes'].includes(action);
    }
    
    // Viewer permissions
    if (userPermission === 'viewer') {
      return ['comment'].includes(action);
    }
    
    return false;
  }

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
      await this.verifySpaceAccess(collaborationSpaceId, userId);

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
      await this.verifySpaceAccess(collaborationSpaceId, userId);

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

      // Only admins, owners, and request creators can view change requests
      const space = await CollaborationSpace.findById(collaborationSpaceId);
      const userPermission = this.getUserPermission(space, userId);

      // Check if user has permission to view change requests
      const canViewRequests = userPermission === 'admin' || space.ownerId === userId;
      
      if (!canViewRequests) {
        // Non-admins/non-owners can only see their own requests
        query.requestedBy = userId;
      }
      // Admins and owners can see all requests in the space

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
      const space = await this.verifySpaceAccess(request.collaborationSpaceId._id || request.collaborationSpaceId, userId);

      // Check if user can view this request
      const userPermission = this.getUserPermission(space, userId);
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
      const space = await this.verifySpaceAccess(request.collaborationSpaceId, reviewerId);
      
      if (!this.canUserPerformAction(space, reviewerId, 'approve_changes')) {
        throw new Error('Permission denied: You cannot review change requests');
      }

      // Cannot review own request unless you are the space owner or admin
      if (request.requestedBy === reviewerId && space.ownerId !== reviewerId) {
        const userPermission = this.getUserPermission(space, reviewerId);
        if (userPermission !== 'admin') {
          throw new Error('You cannot review your own change request');
        }
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
      console.log('applyChangeRequest called with:', { requestId, applierId });
      
      const request = await ChangeRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Change request not found');
      }

      console.log('Found request:', {
        id: request._id,
        status: request.status,
        sharedContentId: request.sharedContentId,
        proposedContent: request.proposedContent
      });

      if (request.status !== 'approved') {
        throw new Error('Only approved change requests can be applied');
      }

      // Get the content to update
      const content = await SharedContent.findById(request.sharedContentId);
      
      if (!content) {
        throw new Error('Content not found');
      }

      console.log('Found content before update:', {
        id: content._id,
        title: content.title,
        currentContent: typeof content.content === 'string' 
          ? content.content.substring(0, 100) + '...'
          : JSON.stringify(content.content).substring(0, 100) + '...'
      });

      // Simple, direct update - handle both string and JSON string content
      let newContent = request.proposedContent;
      
      // If proposedContent is a JSON string, try to parse it
      if (typeof newContent === 'string' && (newContent.startsWith('[') || newContent.startsWith('{'))) {
        try {
          newContent = JSON.parse(newContent);
        } catch (e) {
          // If parsing fails, keep it as a string
          console.log('Could not parse proposedContent as JSON, keeping as string');
        }
      }
      
      content.content = newContent;
      content.lastModifiedBy = applierId;
      content.lastModifiedByName = request.reviewedByName || 'Admin';
      content.version = (content.version || 0) + 1;
      content.updatedAt = new Date();

      // Save the updated content
      const savedContent = await content.save();
      
      console.log('Content updated successfully:', {
        id: savedContent._id,
        newContent: typeof savedContent.content === 'string'
          ? savedContent.content.substring(0, 100) + '...'
          : JSON.stringify(savedContent.content).substring(0, 100) + '...',
        version: savedContent.version
      });

      // Mark request as applied
      request.status = 'applied';
      request.appliedAt = new Date();
      request.appliedBy = applierId;
      await request.save();

      console.log('Request marked as applied');

      return {
        message: 'Change request applied successfully',
        updatedContent: savedContent
      };
    } catch (error) {
      console.error('Error in applyChangeRequest:', error);
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
      const space = await this.verifySpaceAccess(request.collaborationSpaceId, userId);
      const userPermission = this.getUserPermission(space, userId);
      const canComment = userPermission === 'admin' || 
                        request.requestedBy === userId || 
                        request.reviewedBy === userId ||
                        this.canUserPerformAction(space, userId, 'comment');

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
      const space = await this.verifySpaceAccess(request.collaborationSpaceId, userId);
      const userPermission = this.getUserPermission(space, userId);
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
      await this.verifySpaceAccess(collaborationSpaceId, userId);

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
      const userSpaces = await CollaborationSpace.find({
        'collaborators': {
          $elemMatch: {
            userId: userId,
            status: 'active'
          }
        }
      });
      
      const adminSpaceIds = userSpaces
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
