import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import './SpaceContentList.css'; // Use dedicated CSS for modern styling

const SpaceContentList = ({ spaceId, onEditContent }) => {
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
              <div className="content-menu">⋮</div>
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
    </div>
  );
};

export default SpaceContentList;
