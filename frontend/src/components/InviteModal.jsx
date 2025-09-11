import React, { useState } from 'react';
import api from '../utils/axios';
import './InviteModal.css';

const InviteModal = ({ spaceId, spaceName, isOpen, onClose, onInviteSent }) => {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post(`/api/collaborate/spaces/${spaceId}/invite`, {
        email: email.trim(),
        permission,
        message: message.trim()
      });

      if (response.data.success) {
        onInviteSent({
          email,
          inviteUrl: response.data.inviteUrl,
          invite: response.data.invite
        });
        
        // Reset form
        setEmail('');
        setPermission('view');
        setMessage('');
        onClose();
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      setError(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="invite-modal-overlay">
      <div className="invite-modal">
        <div className="invite-modal-header">
          <h2>Invite Collaborator</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="invite-modal-body">
          <p className="space-info">
            Invite someone to collaborate in "<strong>{spaceName}</strong>"
          </p>

          <form onSubmit={handleSubmit} className="invite-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter collaborator's email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="permission">Permission Level</label>
              <select
                id="permission"
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
              >
                <option value="view">View Only - Can see shared content</option>
                <option value="edit">Editor - Can modify content and submit changes</option>
                <option value="admin">Admin - Full control including permissions</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="message">Personal Message (Optional)</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message to your invitation..."
                rows={3}
              />
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
                type="submit" 
                className="invite-btn" 
                disabled={loading || !email.trim()}
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
