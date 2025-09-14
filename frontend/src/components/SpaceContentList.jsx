import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import './ContentList.css'; // Reuse existing CSS for consistent styling

const SpaceContentList = ({ spaceId }) => {
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading space content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (!contentList || contentList.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Content</h3>
        <p>This collaboration space doesn't have any content yet.</p>
      </div>
    );
  }

  return (
    <div className="content-list-container">
      <h2 className="content-list-title">Shared Content</h2>
      <div className="content-items">
        {contentList.map(item => (
          <div key={item._id} className="content-item" onClick={() => handleViewContent(item._id)}>
            <div className="content-item-header">
              <h3 className="content-item-title">{item.title}</h3>
              <span className="content-item-type">{item.contentType || item.type || 'Content'}</span>
            </div>
            <div className="content-item-meta">
              <div className="content-item-author">
                By {item.createdByName || 'Unknown'}
              </div>
              <div className="content-item-date">
                {formatDate(item.createdAt)}
              </div>
            </div>
            <div className="content-item-footer">
              <button className="view-content-btn">View Content</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpaceContentList;
