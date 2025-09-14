import React, { useState } from 'react';
import './JoinRequestModal.css';

const JoinRequestModal = ({ space, currentUser, onClose, onSubmit }) => {
  const [message, setMessage] = useState('');
  const [requestedPermission, setRequestedPermission] = useState('view');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      await onSubmit({
        spaceId: space._id,
        message: message.trim(),
        requestedPermission
      });
      onClose();
    } catch (error) {
      console.error('Error submitting join request:', error);
      alert(error.message || 'Failed to submit join request');
    } finally {
      setSubmitting(false);
    }
  };

  const getSpaceTypeText = () => {
    switch (space.privacy) {
      case 'public':
        return 'This public space requires approval to join.';
      case 'restricted':
        return 'This restricted space requires owner approval.';
      default:
        return 'This space requires permission to join.';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="join-request-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Request to Join Space</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="space-info-section">
            <h3 className="space-name">{space.title}</h3>
            <p className="space-privacy">{getSpaceTypeText()}</p>
            <p className="space-owner">Owner: {space.ownerName}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="permission">Requested Access Level:</label>
              <select
                id="permission"
                value={requestedPermission}
                onChange={(e) => setRequestedPermission(e.target.value)}
                required
              >
                <option value="view">View Only</option>
                <option value="edit">View & Edit</option>
              </select>
              <small className="form-help">
                {requestedPermission === 'view' 
                  ? 'You can view content and participate in discussions.' 
                  : 'You can view, edit content, and collaborate actively.'
                }
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="message">Message to Owner (Optional):</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell the owner why you'd like to join this space..."
                rows={4}
                maxLength={500}
              />
              <small className="form-help">
                {message.length}/500 characters
              </small>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting}
              >
                {submitting ? 'Sending Request...' : 'Send Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinRequestModal;