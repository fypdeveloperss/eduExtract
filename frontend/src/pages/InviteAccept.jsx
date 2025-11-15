import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import Spinner from '../components/Spinner';
import './InviteAccept.css';

const InviteAccept = () => {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInviteDetails();
    }
  }, [token]);

  const fetchInviteDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/collaborate/invites/${token}`);
      
      if (response.data.success) {
        setInvite(response.data.invite);
      }
    } catch (error) {
      console.error('Error fetching invite:', error);
      setError(error.response?.data?.error || 'Invalid or expired invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user) {
      // Redirect to login/register
      navigate('/dashboard', { 
        state: { 
          message: 'Please log in to accept the collaboration invitation',
          returnTo: `/collaborate/invite/${token}`
        }
      });
      return;
    }

    try {
      setAccepting(true);
      const response = await api.post(`/api/collaborate/invites/${token}/accept`);
      
      if (response.data.success) {
        navigate(`/collaborate/space/${response.data.space._id}`, {
          state: { message: 'Successfully joined the collaboration space!' }
        });
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      setError(error.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvite = () => {
    navigate('/collaborate', {
      state: { message: 'Invitation declined' }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <Spinner />
            <p className="text-[#171717cc] dark:text-[#fafafacc] text-lg">Loading invitation details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mb-3">Invalid Invitation</h2>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">{error}</p>
            <button 
              onClick={() => navigate('/collaborate')}
              className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
            >
              Go to CollaborateHub
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mb-3">Invitation Not Found</h2>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">This invitation link is invalid or has expired.</p>
            <button 
              onClick={() => navigate('/collaborate')}
              className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
            >
              Go to CollaborateHub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-[#171717] dark:bg-[#fafafa] px-6 py-8 text-center">
            <div className="text-5xl mb-4">👥</div>
            <h1 className="text-2xl md:text-3xl font-bold text-white dark:text-[#171717]">Collaboration Invitation</h1>
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#171717] dark:text-[#fafafa] mb-2">{invite.spaceName}</h2>
              <p className="text-[#171717cc] dark:text-[#fafafacc]">
                <strong>{invite.invitedByName}</strong> has invited you to collaborate in this space.
              </p>
            </div>
            
            {invite.message && (
              <div className="bg-gray-50 dark:bg-[#1f1f1f] border-l-4 border-gray-300 dark:border-gray-600 rounded-r-lg p-4">
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Personal Message:</h3>
                <p className="text-[#171717cc] dark:text-[#fafafacc] italic text-sm">"{invite.message}"</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-3">Your Permission Level:</h3>
              <div className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                invite.permission === 'admin' ? 'bg-amber-500' :
                invite.permission === 'edit' ? 'bg-blue-500' :
                'bg-gray-500'
              }`}>
                {invite.permission === 'view' && '👁️ View Only - Can see shared content'}
                {invite.permission === 'edit' && '✏️ Editor - Can modify content and submit changes'}
                {invite.permission === 'admin' && '⚙️ Admin - Full control including permissions'}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-[#fafafa1a] space-y-2 text-sm text-[#171717cc] dark:text-[#fafafacc]">
              <p>Invited on: {new Date(invite.createdAt).toLocaleDateString()}</p>
              {invite.expiresAt && (
                <p>Expires on: {new Date(invite.expiresAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-6 bg-gray-50 dark:bg-[#1f1f1f] border-t border-gray-200 dark:border-[#fafafa1a] flex flex-col sm:flex-row gap-3 justify-center">
            {user ? (
              <>
                <button 
                  onClick={handleAcceptInvite}
                  className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold"
                  disabled={accepting}
                >
                  {accepting ? 'Accepting...' : 'Accept Invitation'}
                </button>
                <button 
                  onClick={handleDeclineInvite}
                  className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-all text-sm font-semibold"
                >
                  Decline
                </button>
              </>
            ) : (
              <>
                <p className="text-[#171717cc] dark:text-[#fafafacc] text-sm mb-4 text-center">
                  You need to be logged in to accept this invitation.
                </p>
                <button 
                  onClick={() => navigate('/dashboard', { 
                    state: { 
                      message: 'Please log in to accept the collaboration invitation',
                      returnTo: `/collaborate/invite/${token}`
                    }
                  })}
                  className="px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
                >
                  Log In to Accept
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteAccept;
