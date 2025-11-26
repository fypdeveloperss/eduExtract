import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useCustomAlerts } from '../hooks/useCustomAlerts';
import api from '../utils/axios';
import './SpaceContentList.css'; // Use dedicated CSS for modern styling

const SpaceContentList = ({ spaceId, space, userPermission, onEditContent, onContentUpdate }) => {
  const { user: currentUser } = useAuth();
  const { success, error: showError } = useCustomAlerts();
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContent = async () => {
      if (!spaceId) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching content for space: ${spaceId}`);
        
        const res = await api.get(`/api/collaborate/spaces/${spaceId}/content`);
        
        if (res.data.success) {
          console.log('Content fetch successful:', res.data);
          setContentList(res.data.content || []);
        } else {
          console.error('API returned success: false', res.data);
          setError('Failed to fetch content: ' + (res.data.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error fetching space content:', err);
        const errorMessage = err.response?.data?.error || err.message || 'An error occurred';
        setError(`Failed to fetch content: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, [spaceId]);

  const handleViewContent = (contentId) => {
    // Navigate to the shared content view using the correct route
    navigate(`/collaborate/content/${contentId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getContentIcon = (contentType) => {
    switch (contentType?.toLowerCase()) {
      case 'blog': return '📝';
      case 'summary': return '📄';
      case 'flashcards': return '🗂️';
      case 'quiz': return '❓';
      case 'slides': return '📊';
      case 'document': return '📋';
      case 'video': return '🎥';
      default: return '📄';
    }
  };

  // Check if user can delete specific content
  // Space owner/admin can delete any content, editors can only delete their own
  const canDeleteContent = (contentItem) => {
    if (!currentUser || !space) return false;
    
    // Space owner can delete any content
    if (space.ownerId === currentUser.uid) return true;
    
    // Admin permission can delete any content
    if (userPermission === 'admin') return true;
    
    // Editors can delete their own content
    if (contentItem.createdBy === currentUser.uid && userPermission === 'edit') return true;
    
    return false;
  };

  const handleDeleteClick = (e, contentItem) => {
    e.stopPropagation();
    setContentToDelete(contentItem);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contentToDelete) return;
    
    try {
      setDeleting(true);
      
      const response = await api.delete(`/api/collaborate/content/${contentToDelete._id}`);
      
      if (response.data.success) {
        // Remove from local state
        setContentList(prevContent => prevContent.filter(item => item._id !== contentToDelete._id));
        success('Content deleted successfully!', 'Deleted');
        
        // Notify parent if callback exists
        if (onContentUpdate) {
          onContentUpdate();
        }
      }
    } catch (err) {
      console.error('Error deleting content:', err);
      showError(err.response?.data?.error || 'Failed to delete content', 'Delete Failed');
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setContentToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setContentToDelete(null);
  };

  if (loading) {
    return (
      <div className="space-content-loading">
        <div className="loading-spinner-modern">
          <div className="spinner"></div>
        </div>
        <p className="loading-text">Loading shared content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-content-error">
        <div className="error-icon">⚠️</div>
        <h3 className="error-title">Unable to Load Content</h3>
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()} className="retry-btn-modern">
          <span className="retry-icon">🔄</span>
          Try Again
        </button>
      </div>
    );
  }

  if (!contentList || contentList.length === 0) {
    return (
      <div className="space-content-empty">
        <div className="empty-icon">📭</div>
        <h3 className="empty-title">No Content Yet</h3>
        <p className="empty-description">
          This collaboration space is ready for content. Start by adding some shared materials to get the conversation going!
        </p>
      </div>
    );
  }

  return (
    <div className="space-content-container">
      <div className="content-header">
        <h2 className="content-title">
          <span className="title-icon">📚</span>
          Shared Content
        </h2>
        <div className="content-stats">
          <span className="content-count">{contentList.length} items</span>
        </div>
      </div>
      
      <div className="content-grid">
        {contentList.map(item => (
          <div 
            key={item._id} 
            className="content-card" 
            onClick={() => handleViewContent(item._id)}
          >
            <div className="content-card-header">
              <div className={`content-type-badge content-type-${(item.contentType || item.type || 'default').toLowerCase()}`}>
                <span className="content-icon">{getContentIcon(item.contentType || item.type)}</span>
                <span className="content-type-text">{item.contentType || item.type || 'Content'}</span>
              </div>
              {canDeleteContent(item) ? (
                <button 
                  className="delete-btn-header"
                  onClick={(e) => handleDeleteClick(e, item)}
                  title={
                    space?.ownerId === currentUser?.uid || userPermission === 'admin'
                      ? 'Delete content (Admin)'
                      : 'Delete your content'
                  }
                >
                  <Trash2 size={18} />
                </button>
              ) : (
                <div className="content-menu-placeholder"></div>
              )}
            </div>
            
            <div className="content-card-body">
              <h3 className="content-card-title">{item.title}</h3>
              <div className="content-card-meta">
                <div className="author-info">
                  <span className="author-avatar">👤</span>
                  <span className="author-name">{item.createdByName || 'Unknown'}</span>
                </div>
                <div className="content-date">
                  <span className="date-icon">🕒</span>
                  <span className="date-text">{formatDate(item.createdAt)}</span>
                </div>
              </div>
            </div>
            
            <div className="content-card-footer">
              <div className="content-stats-row">
                <div className="stat-item">
                  <span className="stat-icon">👁️</span>
                  <span className="stat-value">{item.stats?.views || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">💬</span>
                  <span className="stat-value">{item.stats?.comments || 0}</span>
                </div>
              </div>
              <div className="content-actions">
                <button 
                  className="view-btn-modern"
                  onClick={() => handleViewContent(item._id)}
                >
                  <span className="btn-text">View</span>
                  <span className="btn-arrow">→</span>
                </button>
                {onEditContent && (
                  <button 
                    className="edit-btn-modern"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditContent(item);
                    }}
                  >
                    <span className="btn-text">✏️ Edit</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="card-hover-overlay">
              <div className="hover-content">
                <span className="hover-text">Click to view content</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && contentToDelete && (
        <div className="delete-modal-overlay" onClick={handleDeleteCancel}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <div className="delete-modal-icon">
                <AlertTriangle size={32} className="warning-icon" />
              </div>
              <button className="close-modal-btn" onClick={handleDeleteCancel}>
                <X size={20} />
              </button>
            </div>
            
            <div className="delete-modal-content">
              <h3>Delete Content</h3>
              <p className="delete-warning-text">
                Are you sure you want to delete <strong>"{contentToDelete.title}"</strong>?
              </p>
              
              <div className="delete-content-info">
                <div className="info-row">
                  <span className="info-label">Type:</span>
                  <span className="info-value content-type-pill">{contentToDelete.contentType || contentToDelete.type}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Created by:</span>
                  <span className="info-value">{contentToDelete.createdByName || 'Unknown'}</span>
                </div>
              </div>

              <div className="delete-warning-box">
                <AlertTriangle size={16} />
                <span>This action cannot be undone. All associated data will be permanently removed.</span>
              </div>
            </div>
            
            <div className="delete-modal-actions">
              <button 
                className="cancel-delete-btn" 
                onClick={handleDeleteCancel}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-btn" 
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Content'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceContentList;
