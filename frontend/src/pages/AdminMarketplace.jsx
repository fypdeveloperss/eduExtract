import { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';

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

  const getDifficultyColor = (difficulty) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  };

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking admin status...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You don't have admin privileges.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading pending content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Marketplace Content Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Review and approve pending marketplace content
              </p>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Admin
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingContent.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Pending Content List */}
        {pendingContent.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">All Caught Up!</h3>
            <p className="text-gray-600 dark:text-gray-400">No pending content to review.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingContent.map((content) => (
              <div key={content._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-3xl">{getCategoryIcon(content.category)}</span>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {content.title}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 px-2 py-1 rounded-full text-sm">
                            {content.category}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-sm ${getDifficultyColor(content.difficulty)}`}>
                            {content.difficulty}
                          </span>
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1 rounded-full text-sm">
                            {content.contentType}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-4">{content.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Subject:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{content.subject}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Price:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatPrice(content.price, content.currency)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Plagiarism Score:</span>
                        <p className={`font-medium ${
                          content.plagiarismScore < 30 ? 'text-green-600' :
                          content.plagiarismScore < 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {content.plagiarismScore || 'N/A'}%
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Uploaded:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(content.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {content.tags && content.tags.length > 0 && (
                      <div className="mt-4">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {content.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs"
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
                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                    >
                      {actionLoading[content._id] === 'approving' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Approving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleReject(content._id)}
                      disabled={actionLoading[content._id]}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                    >
                      {actionLoading[content._id] === 'rejecting' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </>
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
