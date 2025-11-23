import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { useCustomAlerts } from '../hooks/useCustomAlerts';
import Spinner from '../components/Spinner';

const CollaborationInvites = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);
  const navigate = useNavigate();
  const { error: showError } = useCustomAlerts();

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
      showError('Failed to accept invitation', 'Invitation Error');
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
      showError('Failed to decline invitation', 'Invitation Error');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Spinner />
          <p className="text-[#171717cc] dark:text-[#fafafacc] text-lg">Loading invitations...</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        {/* Header */}
        <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl shadow-lg px-6 py-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-3 flex items-center justify-center gap-3">
            <span>📧</span>
            <span>Collaboration Invitations</span>
          </h1>
          <p className="text-base md:text-lg text-[#171717cc] dark:text-[#fafafacc] mb-6">
            Manage your pending collaboration invitations
          </p>
          <button 
            onClick={() => navigate('/collaborate')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-all text-sm font-semibold"
          >
            <span>←</span>
            <span>Back to Collaborate Hub</span>
          </button>
        </div>

        {invitations.length === 0 ? (
          <div className="text-center py-16 px-8 bg-white dark:bg-[#171717] rounded-xl shadow-lg border border-gray-200 dark:border-[#fafafa1a]">
            <div className="text-7xl mb-6">📭</div>
            <h3 className="text-2xl font-semibold text-[#171717] dark:text-[#fafafa] mb-3">
              No Pending Invitations
            </h3>
            <p className="text-[#171717cc] dark:text-[#fafafacc] text-lg mb-8">
              You don't have any pending invitations right now.
            </p>
            <button 
              onClick={() => navigate('/collaborate')}
              className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
            >
              Explore Collaboration Spaces
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {invitations.map(inv => (
              <div 
                key={inv._id} 
                className="bg-white dark:bg-[#171717] rounded-xl shadow-lg border border-gray-200 dark:border-[#fafafa1a] p-6 transition-all hover:shadow-xl"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-2 flex items-center gap-2">
                      <span>🏠</span>
                      <span>{inv.spaceName}</span>
                    </h3>
                    <div className="space-y-1">
                      <p className="text-[#171717cc] dark:text-[#fafafacc] flex items-center gap-2 text-sm">
                        <span>👤</span>
                        <span>Invited by: <strong>{inv.invitedByName}</strong></span>
                      </p>
                      <p className="text-[#171717cc] dark:text-[#fafafacc] text-xs flex items-center gap-2">
                        <span>📅</span>
                        <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg font-semibold text-white text-xs min-w-[100px] text-center ${
                    inv.permission === 'admin' 
                      ? 'bg-amber-500' 
                      : 'bg-gray-500'
                  }`}>
                    {inv.permission === 'admin' ? '👑 Admin' : '👤 Member'}
                  </div>
                </div>

                {/* Message */}
                {inv.message && (
                  <div className="bg-gray-50 dark:bg-[#1f1f1f] border-l-4 border-gray-300 dark:border-gray-600 rounded-r-lg p-4 mb-4">
                    <p className="text-[#171717cc] dark:text-[#fafafacc] italic flex items-start gap-2 text-sm">
                      <span className="text-lg">💬</span>
                      <span>"{inv.message}"</span>
                    </p>
                  </div>
                )}

                {/* Space Stats */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <span className="px-3 py-1.5 bg-gray-50 dark:bg-[#1f1f1f] text-[#171717] dark:text-[#fafafa] rounded-lg text-xs flex items-center gap-2 border border-gray-200 dark:border-[#fafafa1a]">
                    <span>📊</span>
                    <span>{inv.spaceStats?.memberCount || 0} Members</span>
                  </span>
                  <span className="px-3 py-1.5 bg-gray-50 dark:bg-[#1f1f1f] text-[#171717] dark:text-[#fafafa] rounded-lg text-xs flex items-center gap-2 border border-gray-200 dark:border-[#fafafa1a]">
                    <span>📄</span>
                    <span>{inv.spaceStats?.contentCount || 0} Content</span>
                  </span>
                  <span className="px-3 py-1.5 bg-gray-50 dark:bg-[#1f1f1f] text-[#171717] dark:text-[#fafafa] rounded-lg text-xs flex items-center gap-2 border border-gray-200 dark:border-[#fafafa1a]">
                    <span>🔒</span>
                    <span>{inv.spacePrivacy || 'Private'}</span>
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
                  <button
                    disabled={processing === inv._id}
                    onClick={() => handleDecline(inv._id)}
                    className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px] text-sm font-semibold"
                  >
                    {processing === inv._id ? (
                      <div className="w-4 h-4 border-2 border-[#171717] dark:border-[#fafafa] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>❌</span>
                        <span>Decline</span>
                      </>
                    )}
                  </button>
                  <button
                    disabled={processing === inv._id}
                    onClick={() => handleAccept(inv._id)}
                    className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px] text-sm font-semibold"
                  >
                    {processing === inv._id ? (
                      <div className="w-4 h-4 border-2 border-white dark:border-[#171717] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>✅</span>
                        <span>Accept & Join</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Expiry Info */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#fafafa1a] text-center">
                  <small className="text-[#171717cc] dark:text-[#fafafacc] text-xs flex items-center justify-center gap-2">
                    <span>⏰</span>
                    <span>This invitation expires in 7 days</span>
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaborationInvites;
