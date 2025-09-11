import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import Spinner from '../components/Spinner';

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
    <div style={{ textAlign: 'center', padding: 50 }}>
      <Spinner />
      <p style={{ marginTop: 20, color: '#6B7280' }}>Loading invitations...</p>
    </div>
  );

  if (error) return (
    <div style={{ color: 'red', textAlign: 'center', padding: 20 }}>
      {error} <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1 style={{ color: '#1F2937' }}>📧 Collaboration Invitations</h1>
      {invitations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#F9FAFB', borderRadius: 10 }}>
          <h2 style={{ color: '#374151' }}>No Pending Invitations</h2>
          <p style={{ color: '#6B7280' }}>You don't have any pending invitations right now.</p>
        </div>
      ) : (
        invitations.map(inv => (
          <div
            key={inv._id}
            style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 20, marginBottom: 16, background: '#fff' }}
          >
            <h3 style={{ margin: 0, color: '#1F2937' }}>🏠 {inv.spaceName}</h3>
            <p style={{ margin: '8px 0', color: '#6B7280' }}>
              👤 Invited by: <strong style={{ color: '#374151' }}>{inv.invitedByName}</strong>
            </p>
            <p style={{ margin: '8px 0', color: '#6B7280' }}>
              🔐 Permission: <strong style={{ color: '#374151' }}>{inv.permission}</strong>
            </p>
            {inv.message && <p style={{ fontStyle: 'italic', color: '#4B5563' }}>💬 "{inv.message}"</p>}
            <div style={{ textAlign: 'right' }}>
              <button
                disabled={processing === inv._id}
                onClick={() => handleDecline(inv._id)}
                style={{ marginRight: 10, padding: '6px 12px', cursor: processing === inv._id ? 'not-allowed' : 'pointer' }}
              >❌ Decline</button>
              <button
                disabled={processing === inv._id}
                onClick={() => handleAccept(inv._id)}
                style={{ padding: '6px 12px', cursor: processing === inv._id ? 'not-allowed' : 'pointer' }}
              >✅ Accept & Join</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default CollaborationInvites;
