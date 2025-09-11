const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const CollaborationService = require('../services/collaborationService');
const SharedContentService = require('../services/sharedContentService');
const ChangeRequestService = require('../services/changeRequestService');

// ===== COLLABORATION SPACE ROUTES =====

// Create new collaboration space
router.post('/spaces', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName, email: userEmail } = req.user;
    const spaceData = req.body;

    // Ensure we have required user data
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }

    const space = await CollaborationService.createCollaborationSpace(spaceData, userId, userName, userEmail);
    
    res.status(201).json({
      success: true,
      space
    });
  } catch (error) {
    console.error('Error creating collaboration space:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's collaboration spaces
router.get('/spaces', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { page = 1, limit = 20, role = 'all' } = req.query;

    const result = await CollaborationService.getUserCollaborationSpaces(
      userId, 
      parseInt(page), 
      parseInt(limit), 
      role
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting collaboration spaces:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific collaboration space
router.get('/spaces/:spaceId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;

    const space = await CollaborationService.getCollaborationSpaceById(spaceId, userId);
    
    res.json({
      success: true,
      space
    });
  } catch (error) {
    console.error('Error getting collaboration space:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      error: error.message
    });
  }
});

// Update collaboration space
router.put('/spaces/:spaceId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;
    const updateData = req.body;

    const space = await CollaborationService.updateCollaborationSpace(spaceId, updateData, userId);
    
    res.json({
      success: true,
      space
    });
  } catch (error) {
    console.error('Error updating collaboration space:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete collaboration space
router.delete('/spaces/:spaceId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;

    const result = await CollaborationService.deleteCollaborationSpace(spaceId, userId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting collaboration space:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// ===== COLLABORATOR MANAGEMENT =====

// Invite collaborator
router.post('/spaces/:spaceId/invite', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { spaceId } = req.params;
    const inviteData = req.body;

    const result = await CollaborationService.inviteCollaborator(spaceId, inviteData, userId, userName);
    
    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error inviting collaborator:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Accept collaboration invite
router.post('/invites/:token/accept', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { token } = req.params;
    const { responseMessage } = req.body;

    const space = await CollaborationService.acceptInvite(token, userId, userName);
    
    res.json({
      success: true,
      space,
      message: 'Invitation accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update collaborator permission
router.put('/spaces/:spaceId/collaborators/:userId', verifyToken, async (req, res) => {
  try {
    const { uid: updaterId } = req.user;
    const { spaceId, userId: collaboratorUserId } = req.params;
    const { permission } = req.body;

    if (!permission || !['view', 'edit', 'admin'].includes(permission)) {
      return res.status(400).json({
        success: false,
        error: 'Valid permission is required (view, edit, or admin)'
      });
    }

    const space = await CollaborationService.updateCollaboratorPermission(
      spaceId, 
      collaboratorUserId, 
      permission, 
      updaterId
    );
    
    res.json({
      success: true,
      space
    });
  } catch (error) {
    console.error('Error updating collaborator permission:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Remove collaborator
router.delete('/spaces/:spaceId/collaborators/:userId', verifyToken, async (req, res) => {
  try {
    const { uid: removerId } = req.user;
    const { spaceId, userId: collaboratorUserId } = req.params;

    const space = await CollaborationService.removeCollaborator(spaceId, collaboratorUserId, removerId);
    
    res.json({
      success: true,
      space,
      message: 'Collaborator removed successfully'
    });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// ===== SHARED CONTENT ROUTES =====

// Create shared content
router.post('/spaces/:spaceId/content', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { spaceId } = req.params;
    const contentData = req.body;

    const content = await SharedContentService.createSharedContent(
      contentData, 
      spaceId, 
      userId, 
      userName
    );
    
    res.status(201).json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error creating shared content:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get shared content for a space
router.get('/spaces/:spaceId/content', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;
    const { page = 1, limit = 20, contentType, status, createdBy, search } = req.query;

    const filters = { contentType, status, createdBy, search };
    const result = await SharedContentService.getSharedContent(
      spaceId, 
      userId, 
      parseInt(page), 
      parseInt(limit), 
      filters
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting shared content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific shared content
router.get('/content/:contentId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { contentId } = req.params;

    const content = await SharedContentService.getSharedContentById(contentId, userId);
    
    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error getting shared content:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      error: error.message
    });
  }
});

// Update shared content
router.put('/content/:contentId', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { contentId } = req.params;
    const updateData = req.body;

    const content = await SharedContentService.updateSharedContent(
      contentId, 
      updateData, 
      userId, 
      userName
    );
    
    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error updating shared content:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete shared content
router.delete('/content/:contentId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { contentId } = req.params;

    const result = await SharedContentService.deleteSharedContent(contentId, userId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting shared content:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Update content status
router.patch('/content/:contentId/status', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { contentId } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'review', 'approved', 'published'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required (draft, review, approved, or published)'
      });
    }

    const content = await SharedContentService.updateContentStatus(contentId, status, userId);
    
    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error updating content status:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// ===== CHANGE REQUEST ROUTES =====

// Create change request
router.post('/content/:contentId/change-requests', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { contentId } = req.params;
    const requestData = {
      ...req.body,
      sharedContentId: contentId
    };

    const changeRequest = await ChangeRequestService.createChangeRequest(
      requestData, 
      userId, 
      userName
    );
    
    res.status(201).json({
      success: true,
      changeRequest
    });
  } catch (error) {
    console.error('Error creating change request:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get change requests for a space
router.get('/spaces/:spaceId/change-requests', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { spaceId } = req.params;
    const { page = 1, limit = 20, status, requestType, priority, requestedBy } = req.query;

    const filters = { status, requestType, priority, requestedBy };
    const result = await ChangeRequestService.getChangeRequests(
      spaceId, 
      userId, 
      parseInt(page), 
      parseInt(limit), 
      filters
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting change requests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific change request
router.get('/change-requests/:requestId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { requestId } = req.params;

    const request = await ChangeRequestService.getChangeRequestById(requestId, userId);
    
    res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Error getting change request:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({
      success: false,
      error: error.message
    });
  }
});

// Update change request
router.put('/change-requests/:requestId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { requestId } = req.params;
    const updateData = req.body;

    const request = await ChangeRequestService.updateChangeRequest(requestId, updateData, userId);
    
    res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Error updating change request:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Review change request
router.post('/change-requests/:requestId/review', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { requestId } = req.params;
    const reviewData = req.body;

    const request = await ChangeRequestService.reviewChangeRequest(
      requestId, 
      reviewData, 
      userId, 
      userName
    );
    
    res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Error reviewing change request:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Add comment to change request
router.post('/change-requests/:requestId/comments', verifyToken, async (req, res) => {
  try {
    const { uid: userId, name: userName } = req.user;
    const { requestId } = req.params;
    const commentData = req.body;

    const request = await ChangeRequestService.addCommentToChangeRequest(
      requestId, 
      commentData, 
      userId, 
      userName
    );
    
    res.json({
      success: true,
      request
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete change request
router.delete('/change-requests/:requestId', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { requestId } = req.params;

    const result = await ChangeRequestService.deleteChangeRequest(requestId, userId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting change request:', error);
    res.status(error.message.includes('Permission denied') ? 403 : 400).json({
      success: false,
      error: error.message
    });
  }
});

// ===== SEARCH AND DISCOVERY =====

// Search public collaboration spaces
router.get('/discover', async (req, res) => {
  try {
    const { q: query, page = 1, limit = 20, category, tags } = req.query;
    
    const filters = { category };
    if (tags) {
      filters.tags = tags.split(',');
    }

    const result = await CollaborationService.searchPublicSpaces(
      query, 
      parseInt(page), 
      parseInt(limit), 
      filters
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error searching collaboration spaces:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search user's content across all spaces
router.get('/content/search', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { q: query, page = 1, limit = 20, contentType, status } = req.query;
    
    const filters = { page: parseInt(page), limit: parseInt(limit), contentType, status };
    const result = await SharedContentService.searchContent(query, userId, filters);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error searching content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== USER DASHBOARD ROUTES =====

// Get user collaboration stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;

    const stats = await CollaborationService.getCollaborationStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting collaboration stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's change requests
router.get('/my-change-requests', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { page = 1, limit = 20, status, collaborationSpaceId } = req.query;

    const filters = { status, collaborationSpaceId };
    const result = await ChangeRequestService.getUserChangeRequests(
      userId, 
      parseInt(page), 
      parseInt(limit), 
      filters
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting user change requests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get pending review requests for user
router.get('/pending-reviews', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    const result = await ChangeRequestService.getPendingReviewRequests(
      userId, 
      parseInt(page), 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting pending review requests:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
