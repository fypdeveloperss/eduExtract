import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/auth';
import LoaderSpinner from './LoaderSpinner';
import './MarketplaceContentSelectionModal.css';

const MarketplaceContentSelectionModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  preSelectedContent = null
}) => {
  const [userContent, setUserContent] = useState([]);
  const [selectedContent, setSelectedContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [publishing, setPublishing] = useState(false);

  // Marketplace metadata for each selected content
  const [contentMetadata, setContentMetadata] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchUserContent();
    }
  }, [isOpen]);

  // Pre-select content if provided
  useEffect(() => {
    if (preSelectedContent && userContent.length > 0) {
      setSelectedContent([preSelectedContent._id]);
      setContentMetadata({
        [preSelectedContent._id]: {
          title: '',
          price: 0,
          category: 'other',
          subject: '',
          difficulty: 'beginner',
          description: '',
          tags: []
        }
      });
    }
  }, [preSelectedContent, userContent]);

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
    setSelectedContent(prev => {
      const newSelected = prev.includes(contentId) 
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId];
      
      // Initialize metadata for newly selected content
      if (!prev.includes(contentId)) {
        setContentMetadata(prevMeta => ({
          ...prevMeta,
          [contentId]: {
            title: '',
            price: 0,
            category: 'other',
            subject: '',
            difficulty: 'beginner',
            description: '',
            tags: []
          }
        }));
      }
      
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    if (selectedContent.length === filteredContent.length) {
      setSelectedContent([]);
      setContentMetadata({});
    } else {
      const allIds = filteredContent.map(content => content._id);
      setSelectedContent(allIds);
      
      // Initialize metadata for all content
      const newMetadata = {};
      allIds.forEach(id => {
        newMetadata[id] = {
          title: '',
          price: 0,
          category: 'other',
          subject: '',
          difficulty: 'beginner',
          description: '',
          tags: []
        };
      });
      setContentMetadata(newMetadata);
    }
  };

  const handleMetadataChange = (contentId, field, value) => {
    setContentMetadata(prev => ({
      ...prev,
      [contentId]: {
        ...prev[contentId],
        [field]: value
      }
    }));
  };

  const handleConfirm = async () => {
    if (selectedContent.length === 0) {
      setError('Please select at least one content item to publish.');
      return;
    }

    // Validate that all selected content has required metadata
    const missingMetadata = selectedContent.filter(id => {
      const meta = contentMetadata[id];
      return !meta || !meta.title?.trim() || !meta.subject.trim() || !meta.description.trim();
    });

    if (missingMetadata.length > 0) {
      setError('Please fill in all required fields (title, subject and description) for all selected content.');
      return;
    }

    setPublishing(true);
    try {
      const contentToPublish = userContent.filter(content => 
        selectedContent.includes(content._id)
      ).map(content => ({
        ...content,
        marketplaceMetadata: contentMetadata[content._id]
      }));
      
      await onConfirm(contentToPublish);
      onClose();
      setSelectedContent([]);
      setContentMetadata({});
      setSearchTerm('');
      setFilterType('all');
    } catch (err) {
      setError('Failed to publish content to marketplace. Please try again.');
      console.error('Error publishing content to marketplace:', err);
    } finally {
      setPublishing(false);
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

  const categories = [
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'science', label: 'Science' },
    { value: 'history', label: 'History' },
    { value: 'literature', label: 'Literature' },
    { value: 'languages', label: 'Languages' },
    { value: 'arts', label: 'Arts' },
    { value: 'technology', label: 'Technology' },
    { value: 'business', label: 'Business' },
    { value: 'health', label: 'Health' },
    { value: 'other', label: 'Other' }
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="marketplace-content-selection-modal bg-white dark:bg-[#171717] rounded-2xl shadow-xl">
        <div className="modal-header border-b border-gray-200 dark:border-[#2E2E2E]">
          <h2 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] flex items-center">
            <span className="w-8 h-8 bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mr-3">
              📚
            </span>
            Publish Content to Marketplace
          </h2>
          <button className="close-btn text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Content Selection Section */}
          <div className="border-b border-gray-200 dark:border-[#2E2E2E] pb-6 mb-6">
            <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
              <span className="w-8 h-8 bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mr-3">
                📝
              </span>
              Select Content to Publish
            </h3>

            <div className="content-filters space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                    Search Content
                  </label>
                  <input
                    type="text"
                    placeholder="Search your content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                    Filter by Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
                  >
                    <option value="all">All Types</option>
                    {contentTypes.map(type => (
                      <option key={type} value={type} className="capitalize">{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-3 border border-gray-200 dark:border-[#2E2E2E]">
                <button 
                  className="text-sm text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] font-medium"
                  onClick={handleSelectAll}
                  disabled={filteredContent.length === 0}
                >
                  {selectedContent.length === filteredContent.length && filteredContent.length > 0 
                    ? 'Deselect All' 
                    : `Select All (${filteredContent.length})`
                  }
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {selectedContent.length} selected
                </span>
              </div>
            </div>
          </div>

          <div className="content-list max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3 text-[#171717cc] dark:text-[#fafafacc]">
                <LoaderSpinner size="md" />
                <p>Loading your content...</p>
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No content found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {userContent.length === 0 
                    ? "You haven't created any content yet. Create some content first to publish to the marketplace."
                    : "No content matches your search criteria. Try adjusting your filters."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredContent.map(content => (
                  <div key={content._id} className="content-item-container">
                    <div 
                      className={`content-item bg-white dark:bg-[#1E1E1E] border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedContent.includes(content._id) 
                          ? 'border-[#171717] dark:border-[#fafafa] bg-gray-100 dark:bg-[#171717]' 
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      onClick={() => handleContentToggle(content._id)}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedContent.includes(content._id)}
                          onChange={() => handleContentToggle(content._id)}
                          className="mt-1 h-4 w-4 border-gray-300 rounded accent-[#171717] dark:accent-[#fafafa] focus:ring-1 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-2xl">{getContentTypeIcon(content.type)}</span>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {content.title}
                              </h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 capitalize">
                                  {content.type}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Created {formatDate(content.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Marketplace metadata form for selected content */}
                    {selectedContent.includes(content._id) && (
                      <div className="mt-4 bg-gray-50 dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
                          <span className="w-6 h-6 bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mr-2 text-sm">
                            💰
                          </span>
                          Marketplace Details
                        </h4>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                            Marketplace Title *
                          </label>
                          <input
                            type="text"
                            value={contentMetadata[content._id]?.title || ''}
                            onChange={(e) => handleMetadataChange(content._id, 'title', e.target.value)}
                            placeholder="e.g., Complete Introduction to Calculus Quiz"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Give your content an attractive, descriptive title for the marketplace</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                              Price (USD) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={contentMetadata[content._id]?.price || 0}
                              onChange={(e) => handleMetadataChange(content._id, 'price', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Set to 0 for free content</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                              Category *
                            </label>
                            <select
                              value={contentMetadata[content._id]?.category || 'other'}
                              onChange={(e) => handleMetadataChange(content._id, 'category', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm"
                            >
                              {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                              Difficulty *
                            </label>
                            <select
                              value={contentMetadata[content._id]?.difficulty || 'beginner'}
                              onChange={(e) => handleMetadataChange(content._id, 'difficulty', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm"
                            >
                              {difficulties.map(diff => (
                                <option key={diff.value} value={diff.value}>{diff.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                            Subject *
                          </label>
                          <input
                            type="text"
                            value={contentMetadata[content._id]?.subject || ''}
                            onChange={(e) => handleMetadataChange(content._id, 'subject', e.target.value)}
                            placeholder="e.g., Calculus, World History, English Literature"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                            Description *
                          </label>
                          <textarea
                            value={contentMetadata[content._id]?.description || ''}
                            onChange={(e) => handleMetadataChange(content._id, 'description', e.target.value)}
                            placeholder="Describe what this content covers and why it's valuable..."
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm resize-vertical"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">
                            Tags (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={contentMetadata[content._id]?.tags?.join(', ') || ''}
                            onChange={(e) => {
                              const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                              handleMetadataChange(content._id, 'tags', tags);
                            }}
                            placeholder="e.g., calculus, derivatives, math"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-[#fafafa33] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer bg-gray-50 dark:bg-[#1E1E1E] border-t border-gray-200 dark:border-[#2E2E2E] px-6 py-4 flex justify-end space-x-3">
          <button
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-[#171717cc] dark:text-[#fafafacc] rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={publishing}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={handleConfirm}
            disabled={publishing || selectedContent.length === 0}
          >
            {publishing ? (
              <>
                <LoaderSpinner size="sm" />
                Publishing...
              </>
            ) : (
              "Publish Selected Content"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceContentSelectionModal;