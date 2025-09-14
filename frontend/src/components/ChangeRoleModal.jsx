import React, { useState } from 'react';
import api from '../utils/axios';
import './ChangeRoleModal.css';

const ChangeRoleModal = ({ isOpen, onClose, onRoleChanged, member, spaceId }) => {
  const [newPermission, setNewPermission] = useState(member?.permission || 'view');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.put(
        `/api/collaborate/spaces/${spaceId}/collaborators/${member.userId}`,
        { permission: newPermission }
      );

      if (response.data.success) {
        onRoleChanged(response.data.space);
        onClose();
      }
    } catch (error) {
      console.error('Error updating role:', error);
      setError(error.response?.data?.error || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="role-modal-overlay">
      <div className="role-modal">
        <div className="role-modal-header">
          <h2>Change Role</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="role-modal-body">
          <p className="member-info">
            Updating role for <strong>{member.name}</strong>
          </p>
          <p className="member-email">{member.email}</p>

          <form onSubmit={handleSubmit} className="role-form">
            <div className="form-group">
              <label htmlFor="permission">New Permission Level</label>
              <select
                id="permission"
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value)}
              >
                <option value="view">View Only - Can see shared content</option>
                <option value="edit">Editor - Can modify content and submit changes</option>
                <option value="admin">Admin - Full control including permissions</option>
              </select>
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
                className="update-btn" 
                disabled={loading || newPermission === member.permission}
              >
                {loading ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangeRoleModal;