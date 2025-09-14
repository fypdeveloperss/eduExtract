import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/auth';
import './ContentSelectionModal.css';

const ContentSelectionModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  spaceId, 
  spaceName 
}) => {
  const [userContent, setUserContent] = useState([]);
  const [selectedContent, setSelectedContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (isOpen) {
      fetchUserContent();
    }
  }, [isOpen]);

  const fetchUserContent = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authenticatedFetch('/api/content');

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const content = await response.json();
      setUserContent(content);
    } catch (err) {
      setError('Failed to load your content. Please try again.');
      console.error('Error fetching user content:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = userContent.filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (content.type && content.type.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || content.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleContentToggle = (contentId) => {
    setSelectedContent(prev => 
      prev.includes(contentId) 
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedContent.length === filteredContent.length) {
      setSelectedContent([]);
    } else {
      setSelectedContent(filteredContent.map(content => content._id));
    }
  };

  const handleConfirm = async () => {
    if (selectedContent.length === 0) {
      setError('Please select at least one content item to share.');
      return;
    }

    setLoading(true);
    try {
      const contentToShare = userContent.filter(content => 
        selectedContent.includes(content._id)
      );
      
      await onConfirm(contentToShare);
      onClose();
      setSelectedContent([]);
      setSearchTerm('');
      setFilterType('all');
    } catch (err) {
      setError('Failed to add content to space. Please try again.');
      console.error('Error adding content to space:', err);
    } finally {
      setLoading(false);
    }
  };

  const getContentTypeIcon = (type) => {
    const icons = {
      'blog': '📝',
      'summary': '📄',
      'flashcards': '🗂️',
      'quiz': '❓',
      'slides': '📊',
      'text': '📝',
      'video': '🎥',
      'document': '📄'
    };
    return icons[type] || '📄';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const contentTypes = [...new Set(userContent.map(content => content.type))];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="content-selection-modal">
        <div className="modal-header">
          <h2>Add Content to "{spaceName}"</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="content-filters">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search your content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Types</option>
                {contentTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="selection-controls">
              <button 
                className="select-all-btn"
                onClick={handleSelectAll}
                disabled={filteredContent.length === 0}
              >
                {selectedContent.length === filteredContent.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="selection-count">
                {selectedContent.length} of {filteredContent.length} selected
              </span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="content-list">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading your content...</p>
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="empty-state">
                <p>No content found matching your criteria.</p>
                {userContent.length === 0 && (
                  <p>You haven't created any content yet. Create some content first to share in collaboration spaces.</p>
                )}
              </div>
            ) : (
              filteredContent.map(content => (
                <div 
                  key={content._id}
                  className={`content-item ${selectedContent.includes(content._id) ? 'selected' : ''}`}
                  onClick={() => handleContentToggle(content._id)}
                >
                  <div className="content-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedContent.includes(content._id)}
                      onChange={() => handleContentToggle(content._id)}
                    />
                  </div>
                  
                  <div className="content-info">
                    <div className="content-header-info">
                      <span className="content-icon">
                        {getContentTypeIcon(content.type)}
                      </span>
                      <h3 className="content-title">{content.title}</h3>
                      <span className="content-type">{content.type}</span>
                    </div>
                    
                    <div className="content-meta">
                      <span className="content-date">
                        Created {formatDate(content.createdAt)}
                      </span>
                      {content.updatedAt !== content.createdAt && (
                        <span className="content-updated">
                          Updated {formatDate(content.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-btn"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="confirm-btn"
            onClick={handleConfirm}
            disabled={loading || selectedContent.length === 0}
          >
            {loading ? 'Adding...' : `Add Selected Content (${selectedContent.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentSelectionModal;