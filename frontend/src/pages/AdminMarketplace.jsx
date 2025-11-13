import { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import LoaderSpinner from '../components/LoaderSpinner';

function AdminMarketplace() {
  const { user, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  
  const [pendingContent, setPendingContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  // Redirect if not admin
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingContent();
    }
  }, [isAdmin]);

  const fetchPendingContent = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/marketplace/pending');
      setPendingContent(response.data.content || []);
    } catch (error) {
      console.error('Failed to fetch pending content:', error);
      setError('Failed to load pending content');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (contentId) => {
    try {
      setActionLoading(prev => ({ ...prev, [contentId]: 'approving' }));
      
      const response = await api.post(`/api/marketplace/approve/${contentId}`);
      
      // Remove from pending list
      setPendingContent(prev => prev.filter(item => item._id !== contentId));
      
      console.log('Content approved:', response.data);
    } catch (error) {
      console.error('Failed to approve content:', error);
      setError('Failed to approve content');
    } finally {
      setActionLoading(prev => ({ ...prev, [contentId]: null }));
    }
  };

  const handleReject = async (contentId, reason = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [contentId]: 'rejecting' }));
      
      const response = await api.post(`/api/marketplace/reject/${contentId}`, {
        reason: reason || 'Content does not meet quality standards'
      });
      
      // Remove from pending list
      setPendingContent(prev => prev.filter(item => item._id !== contentId));
      
      console.log('Content rejected:', response.data);
    } catch (error) {
      console.error('Failed to reject content:', error);
      setError('Failed to reject content');
    } finally {
      setActionLoading(prev => ({ ...prev, [contentId]: null }));
    }
  };

  const formatPrice = (price, currency) => {
    if (price === 0) return 'Free';
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    return `${symbols[currency] || '$'}${price}`;
  };

  const getDifficultyColor = () =>
    'bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#fafafa1a] text-[#171717cc] dark:text-[#fafafacc]';

  const getCategoryIcon = (category) => {
    const icons = {
      mathematics: '🔢',
      science: '🔬',
      history: '📚',
      literature: '📖',
      languages: '🌍',
      arts: '🎨',
      technology: '💻',
      business: '💼',
      health: '🏥',
      other: '📁'
    };
    return icons[category] || '📁';
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center px-4">
        <div className="flex flex-col items-center space-y-3 text-center text-[#171717cc] dark:text-[#fafafacc]">
          <LoaderSpinner size="xl" />
          <p>Checking admin status...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 border border-gray-200 dark:border-[#2E2E2E] bg-gray-100 dark:bg-[#1E1E1E] rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">Access Denied</h1>
          <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">You don't have admin privileges.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-semibold"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center px-4">
        <div className="flex flex-col items-center space-y-3 text-center text-[#171717cc] dark:text-[#fafafacc]">
          <LoaderSpinner size="xl" />
          <p>Loading pending content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#171717cc] dark:text-[#fafafacc]">Marketplace Content Management</h1>
              <p className="text-[#171717cc] dark:text-[#fafafacc] mt-2">
                Review and approve pending marketplace content
              </p>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors"
            >
              Back to Admin
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-lg">
                <svg className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Pending Review</p>
                <p className="text-2xl font-bold text-[#171717cc] dark:text-[#fafafacc]">{pendingContent.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] rounded-lg p-4 mb-6">
            <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">{error}</p>
          </div>
        )}

        {/* Pending Content List */}
        {pendingContent.length === 0 ? (
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#171717cc] dark:text-[#fafafacc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-2">All Caught Up!</h3>
            <p className="text-[#171717cc] dark:text-[#fafafacc]">No pending content to review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingContent.map((content) => (
              <div key={content._id} className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-3xl">{getCategoryIcon(content.category)}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-1 rounded-full text-sm border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] capitalize">
                          {content.category}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-sm ${getDifficultyColor()}`}>
                          {content.difficulty}
                        </span>
                        <span className="bg-gray-100 dark:bg-[#2E2E2E] text-[#171717cc] dark:text-[#fafafacc] px-2 py-1 rounded-full text-sm">
                          {content.contentType}
                        </span>
                      </div>
                    </div>

                    <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">{content.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-[#171717cc] dark:text-[#fafafacc]">Subject:</span>
                        <p className="font-medium text-[#171717cc] dark:text-[#fafafacc]">{content.subject}</p>
                      </div>
                      <div>
                        <span className="text-[#171717cc] dark:text-[#fafafacc]">Price:</span>
                        <p className="font-medium text-[#171717cc] dark:text-[#fafafacc]">
                          {formatPrice(content.price, content.currency)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#171717cc] dark:text-[#fafafacc]">Plagiarism Score:</span>
                        <p className="font-medium text-[#171717cc] dark:text-[#fafafacc]">
                          {content.plagiarismScore ?? 'N/A'}%
                        </p>
                      </div>
                      <div>
                        <span className="text-[#171717cc] dark:text-[#fafafacc]">Uploaded:</span>
                        <p className="font-medium text-[#171717cc] dark:text-[#fafafacc]">
                          {new Date(content.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {content.tags && content.tags.length > 0 && (
                      <div className="mt-4">
                        <span className="text-[#171717cc] dark:text-[#fafafacc] text-sm">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {content.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="bg-gray-100 dark:bg-[#2E2E2E] text-[#171717cc] dark:text-[#fafafacc] px-2 py-1 rounded text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => handleApprove(content._id)}
                      disabled={actionLoading[content._id]}
                      className="px-4 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {actionLoading[content._id] === 'approving' ? (
                        <>
                          <LoaderSpinner size="sm" />
                          Approving...
                        </>
                      ) : (
                        <>Approve</>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleReject(content._id)}
                      disabled={actionLoading[content._id]}
                      className="px-4 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {actionLoading[content._id] === 'rejecting' ? (
                        <>
                          <LoaderSpinner size="sm" />
                          Rejecting...
                        </>
                      ) : (
                        <>Reject</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminMarketplace;
