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
      <div className="invite-accept">
        <div className="invite-container">
          <Spinner />
          <p>Loading invitation details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invite-accept">
        <div className="invite-container error">
          <div className="error-icon">❌</div>
          <h2>Invalid Invitation</h2>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/collaborate')}
            className="btn primary"
          >
            Go to CollaborateHub
          </button>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="invite-accept">
        <div className="invite-container error">
          <div className="error-icon">❌</div>
          <h2>Invitation Not Found</h2>
          <p>This invitation link is invalid or has expired.</p>
          <button 
            onClick={() => navigate('/collaborate')}
            className="btn primary"
          >
            Go to CollaborateHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-accept">
      <div className="invite-container">
        <div className="invite-header">
          <div className="invite-icon">👥</div>
          <h1>Collaboration Invitation</h1>
        </div>

        <div className="invite-details">
          <h2>{invite.spaceName}</h2>
          <p className="invite-message">
            <strong>{invite.invitedByName}</strong> has invited you to collaborate in this space.
          </p>
          
          {invite.message && (
            <div className="personal-message">
              <h3>Personal Message:</h3>
              <p>"{invite.message}"</p>
            </div>
          )}

          <div className="permission-info">
            <h3>Your Permission Level:</h3>
            <div className={`permission-badge ${invite.permission}`}>
              {invite.permission === 'view' && '👁️ View Only - Can see shared content'}
              {invite.permission === 'edit' && '✏️ Editor - Can modify content and submit changes'}
              {invite.permission === 'admin' && '⚙️ Admin - Full control including permissions'}
            </div>
          </div>

          <div className="invite-meta">
            <p>Invited on: {new Date(invite.createdAt).toLocaleDateString()}</p>
            {invite.expiresAt && (
              <p>Expires on: {new Date(invite.expiresAt).toLocaleDateString()}</p>
            )}
          </div>
        </div>

        <div className="invite-actions">
          {user ? (
            <>
              <button 
                onClick={handleAcceptInvite}
                className="btn primary"
                disabled={accepting}
              >
                {accepting ? 'Accepting...' : 'Accept Invitation'}
              </button>
              <button 
                onClick={handleDeclineInvite}
                className="btn secondary"
              >
                Decline
              </button>
            </>
          ) : (
            <>
              <p className="auth-required">
                You need to be logged in to accept this invitation.
              </p>
              <button 
                onClick={() => navigate('/dashboard', { 
                  state: { 
                    message: 'Please log in to accept the collaboration invitation',
                    returnTo: `/collaborate/invite/${token}`
                  }
                })}
                className="btn primary"
              >
                Log In to Accept
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteAccept;
