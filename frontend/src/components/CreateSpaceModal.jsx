import React, { useState } from 'react';
import './CreateSpaceModal.css';

const CreateSpaceModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'academic',
    privacy: 'private',
    tags: [],
    settings: {
      allowGuestView: false,
      requireApprovalForJoin: true,
      enableComments: true,
      enableVersioning: true
    }
  });

  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = [
    { value: 'academic', label: 'Academic Course' },
    { value: 'research', label: 'Research Project' },
    { value: 'project', label: 'Group Project' },
    { value: 'study-group', label: 'Study Group' },
    { value: 'other', label: 'Other' }
  ];

  const privacyOptions = [
    { value: 'private', label: 'Private', description: 'Only invited members can access' },
    { value: 'restricted', label: 'Restricted', description: 'Members can request to join' },
    { value: 'public', label: 'Public', description: 'Anyone can view and request to join' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('settings.')) {
      const settingName = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingName]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Clear errors
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTagAdd = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
        setTagInput('');
      }
    }
  };

  const handleTagRemove = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({ submit: error.response?.data?.error || 'Failed to create space' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-space-modal-overlay" onClick={onClose}>
      <div className="create-space-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Collaboration Space</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label htmlFor="title">Space Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter a descriptive title for your space"
                maxLength={200}
                className={errors.title ? 'error' : ''}
              />
              {errors.title && <span className="error-message">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the purpose and goals of this collaboration space"
                maxLength={1000}
                rows={4}
                className={errors.description ? 'error' : ''}
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
              <small className="char-count">{formData.description.length}/1000</small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="privacy">Privacy</label>
                <select
                  id="privacy"
                  name="privacy"
                  value={formData.privacy}
                  onChange={handleInputChange}
                >
                  {privacyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="privacy-description">
              {privacyOptions.find(p => p.value === formData.privacy)?.description}
            </div>
          </div>

          {/* Tags */}
          <div className="form-section">
            <h3>Tags (Optional)</h3>
            <div className="form-group">
              <label htmlFor="tags">Add relevant tags to help others discover your space</label>
              <input
                type="text"
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagAdd}
                placeholder="Type a tag and press Enter or comma"
                maxLength={20}
              />
              <small>Press Enter or comma to add tags. Maximum 5 tags.</small>
              
              {formData.tags.length > 0 && (
                <div className="tags-display">
                  {formData.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleTagRemove(tag)}
                        className="tag-remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="form-section">
            <h3>Space Settings</h3>
            
            <div className="settings-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="settings.allowGuestView"
                  checked={formData.settings.allowGuestView}
                  onChange={handleInputChange}
                />
                <span className="checkmark"></span>
                Allow guest viewing
                <small>Non-members can view content if space is public</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="settings.requireApprovalForJoin"
                  checked={formData.settings.requireApprovalForJoin}
                  onChange={handleInputChange}
                />
                <span className="checkmark"></span>
                Require approval for join requests
                <small>You must approve new member requests</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="settings.enableComments"
                  checked={formData.settings.enableComments}
                  onChange={handleInputChange}
                />
                <span className="checkmark"></span>
                Enable comments
                <small>Members can comment on content and change requests</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="settings.enableVersioning"
                  checked={formData.settings.enableVersioning}
                  onChange={handleInputChange}
                />
                <span className="checkmark"></span>
                Enable version control
                <small>Track changes and maintain content history</small>
              </label>
            </div>
          </div>

          {errors.submit && (
            <div className="error-banner">
              {errors.submit}
            </div>
          )}

          {/* Form Actions */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating...' : 'Create Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSpaceModal;
