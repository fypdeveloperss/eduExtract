import React, { useState } from 'react';
import api from '../utils/axios';
import './ConfirmRemovalModal.css';

const ConfirmRemovalModal = ({ isOpen, onClose, onMemberRemoved, member, spaceId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRemove = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.delete(
        `/api/collaborate/spaces/${spaceId}/collaborators/${member.userId}`
      );

      if (response.data.success) {
        onMemberRemoved(response.data.space);
        onClose();
      }
    } catch (error) {
      console.error('Error removing member:', error);
      setError(error.response?.data?.error || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="removal-modal-overlay">
      <div className="removal-modal">
        <div className="removal-modal-header">
          <h2>Remove Member</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="removal-modal-body">
          <div className="warning-icon">⚠️</div>
          <p className="warning-text">
            Are you sure you want to remove <strong>{member.name}</strong> from this collaboration space?
          </p>
          <p className="member-email">{member.email}</p>
          
          <div className="consequences">
            <h4>This action will:</h4>
            <ul>
              <li>Remove their access to all shared content</li>
              <li>Revoke their collaboration permissions</li>
              <li>Cancel any pending contributions they've made</li>
            </ul>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button 
              onClick={handleRemove}
              className="remove-btn" 
              disabled={loading}
            >
              {loading ? 'Removing...' : 'Remove Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmRemovalModal;