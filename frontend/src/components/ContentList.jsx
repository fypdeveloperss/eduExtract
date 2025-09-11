import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import './ContentList.css';

const ContentList = ({ spaceId, space, currentUser, userPermission, canUserPerformAction }) => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    contentType: '',
    status: '',
    search: ''
  });

  useEffect(() => {
    fetchContent();
  }, [spaceId, filters]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/collaborate/spaces/${spaceId}/content`, {
        params: filters
      });

      if (response.data.success) {
        setContent(response.data.content);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': '#9e9e9e',
      'review': '#ff9800',
      'approved': '#4caf50',
      'published': '#2196f3'
    };
    return colors[status] || colors.draft;
  };

  if (loading) {
    return <div className="content-list-loading">Loading content...</div>;
  }

  return (
    <div className="content-list">
      <div className="content-header">
        <h2>Shared Content</h2>
        {canUserPerformAction('create_content') && (
          <button className="add-content-btn">
            + Add Content
          </button>
        )}
      </div>

      <div className="content-filters">
        <input
          type="text"
          placeholder="Search content..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="search-input"
        />
        
        <select
          value={filters.contentType}
          onChange={(e) => setFilters(prev => ({ ...prev, contentType: e.target.value }))}
          className="filter-select"
        >
          <option value="">All Types</option>
          <option value="document">Documents</option>
          <option value="slide">Slides</option>
          <option value="quiz">Quizzes</option>
          <option value="flashcard">Flashcards</option>
          <option value="summary">Summaries</option>
          <option value="note">Notes</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
        </select>
      </div>

      {content.length > 0 ? (
        <div className="content-grid">
          {content.map(item => (
            <div key={item._id} className="content-card">
              <div className="content-header">
                <h3 className="content-title">{item.title}</h3>
                <div className="content-badges">
                  <span className="type-badge">{item.contentType}</span>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(item.status) }}
                  >
                    {item.status}
                  </span>
                </div>
              </div>

              <div className="content-meta">
                <div className="meta-item">
                  <span className="meta-label">Created by:</span>
                  <span className="meta-value">{item.createdByName}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Last modified:</span>
                  <span className="meta-value">
                    {formatDate(item.updatedAt)} by {item.lastModifiedByName}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Version:</span>
                  <span className="meta-value">v{item.version}</span>
                </div>
              </div>

              <div className="content-stats">
                <span className="stat">👀 {item.stats?.views || 0}</span>
                <span className="stat">💬 {item.stats?.comments || 0}</span>
                <span className="stat">❤️ {item.stats?.likes || 0}</span>
              </div>

              <div className="content-actions">
                <button className="action-btn view">View</button>
                {canUserPerformAction('edit_content') && (
                  <button className="action-btn edit">Edit</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No content found</h3>
          <p>
            {canUserPerformAction('create_content') 
              ? "Start by adding your first piece of content to this collaboration space."
              : "No content has been shared in this space yet."
            }
          </p>
          {canUserPerformAction('create_content') && (
            <button className="add-content-btn">
              Add First Content
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentList;
