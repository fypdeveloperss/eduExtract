import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import Spinner from '../components/Spinner';
import './CollaborationInvites.css';

const CollaborationInvites = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadInvites = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/collaborate/invitations');
        if (res.data.success) setInvitations(res.data.invitations || []);
        else setError('Failed to load invitations');
      } catch {
        setError('Failed to load invitations');
      } finally {
        setLoading(false);
      }
    };
    loadInvites();
  }, []);

  const handleAccept = async (id) => {
    setProcessing(id);
    try {
      const res = await api.post(`/api/collaborate/invitations/${id}/accept`);
      if (res.data.success) {
        setInvitations(prev => prev.filter(i => i._id !== id));
        if (res.data.space?._id) navigate(`/collaborate/space/${res.data.space._id}`);
      }
    } catch {
      alert('Failed to accept invitation');
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (id) => {
    setProcessing(id);
    try {
      const res = await api.post(`/api/collaborate/invitations/${id}/decline`);
      if (res.data.success) setInvitations(prev => prev.filter(i => i._id !== id));
    } catch {
      alert('Failed to decline invitation');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return (
    <div className="collaboration-invites">
      <div className="loading-container">
        <Spinner />
        <p>Loading invitations...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="collaboration-invites">
      <div className="error-message">
        {error} <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="collaboration-invites">
      <div className="invites-header">
        <h1>📧 Collaboration Invitations</h1>
        <p>Manage your pending collaboration invitations</p>
        <button 
          className="back-btn"
          onClick={() => navigate('/collaborate')}
        >
          ← Back to Collaborate Hub
        </button>
      </div>

      {invitations.length === 0 ? (
        <div className="no-invites">
          <div className="no-invites-icon">📭</div>
          <h3>No Pending Invitations</h3>
          <p>You don't have any pending invitations right now.</p>
          <button 
            className="explore-btn"
            onClick={() => navigate('/collaborate')}
          >
            Explore Collaboration Spaces
          </button>
        </div>
      ) : (
        <div className="invites-list">
          {invitations.map(inv => (
            <div key={inv._id} className="invite-card">
              <div className="invite-header">
                <div className="space-info">
                  <h3 className="space-name">🏠 {inv.spaceName}</h3>
                  <div className="invite-meta">
                    <p className="inviter">👤 Invited by: <strong>{inv.invitedByName}</strong></p>
                    <p className="invite-date">📅 {new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={`permission-badge ${inv.permission === 'admin' ? 'admin' : 'member'}`}>
                  {inv.permission === 'admin' ? '👑 Admin' : '👤 Member'}
                </div>
              </div>

              {inv.message && (
                <div className="invite-message">
                  <p>💬 "{inv.message}"</p>
                </div>
              )}

              <div className="space-details">
                <div className="space-stats">
                  <span>📊 {inv.spaceStats?.memberCount || 0} Members</span>
                  <span>📄 {inv.spaceStats?.contentCount || 0} Content</span>
                  <span>🔒 {inv.spacePrivacy || 'Private'}</span>
                </div>
              </div>

              <div className="invite-actions">
                <button
                  className="decline-btn"
                  disabled={processing === inv._id}
                  onClick={() => handleDecline(inv._id)}
                >
                  {processing === inv._id ? (
                    <span className="spinner-small"></span>
                  ) : (
                    '❌ Decline'
                  )}
                </button>
                <button
                  className="accept-btn"
                  disabled={processing === inv._id}
                  onClick={() => handleAccept(inv._id)}
                >
                  {processing === inv._id ? (
                    <span className="spinner-small"></span>
                  ) : (
                    '✅ Accept & Join'
                  )}
                </button>
              </div>

              <div className="expires-info">
                <small>⏰ This invitation expires in 7 days</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollaborationInvites;
