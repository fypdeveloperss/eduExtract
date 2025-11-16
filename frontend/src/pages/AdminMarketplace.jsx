import { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import LoaderSpinner from '../components/LoaderSpinner';
import { Search, CheckCircle, XCircle, Package, Calendar, DollarSign, FileText, Tag, ArrowLeft } from 'lucide-react';

function AdminMarketplace() {
  const { user, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  
  const [pendingContent, setPendingContent] = useState([]);
  const [filteredContent, setFilteredContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContent(pendingContent);
    } else {
      const filtered = pendingContent.filter(
        (content) =>
          content.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          content.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          content.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          content.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContent(filtered);
    }
  }, [searchQuery, pendingContent]);

  const fetchPendingContent = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/marketplace/pending');
      setPendingContent(response.data.content || []);
      setFilteredContent(response.data.content || []);
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
      setError('');
      setSuccess('');
      
      await api.post(`/api/marketplace/approve/${contentId}`);
      
      setPendingContent(prev => prev.filter(item => item._id !== contentId));
      setSuccess('Content approved successfully');
      
      setTimeout(() => setSuccess(''), 3000);
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
      setError('');
      setSuccess('');
      
      await api.post(`/api/marketplace/reject/${contentId}`, {
        reason: reason || 'Content does not meet quality standards'
      });
      
      setPendingContent(prev => prev.filter(item => item._id !== contentId));
      setSuccess('Content rejected successfully');
      
      setTimeout(() => setSuccess(''), 3000);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-lg shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 border border-gray-200 dark:border-[#2E2E2E] bg-gray-100 dark:bg-[#1f1f1f] rounded-full flex items-center justify-center mx-auto">
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-2">
              Marketplace Content Management
            </h1>
            <p className="text-[#171717cc] dark:text-[#fafafacc]">
              Review and approve pending marketplace content
            </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center px-4 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] text-[#171717] dark:text-[#fafafa] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </button>
        </div>

        {/* Stats Card */}
        <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
          <div className="flex items-center">
            <div className="p-3 bg-[#171717] dark:bg-[#fafafa] rounded-lg">
              <Package className="w-6 h-6 text-white dark:text-[#171717]" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Pending Review</p>
              <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">{pendingContent.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
          <input
            type="text"
            placeholder="Search content by title, description, subject, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Pending Content List */}
      {filteredContent.length === 0 ? (
        <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#171717cc] dark:text-[#fafafacc]" />
          </div>
          <h3 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
            {searchQuery ? 'No Results Found' : 'All Caught Up!'}
          </h3>
          <p className="text-[#171717cc] dark:text-[#fafafacc]">
            {searchQuery ? 'Try adjusting your search query' : 'No pending content to review.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredContent.map((content) => (
            <div key={content._id} className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header with Category Icon and Badges */}
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-3xl">{getCategoryIcon(content.category)}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] capitalize">
                          {content.category}
                        </span>
                        <span className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f] text-[#171717] dark:text-[#fafafa] capitalize">
                          {content.difficulty}
                        </span>
                        <span className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f] text-[#171717] dark:text-[#fafafa]">
                          {content.contentType}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    {content.title && (
                      <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-3">
                        {content.title}
                      </h3>
                    )}

                    {/* Description */}
                    <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6 line-clamp-3">
                      {content.description}
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <FileText className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                          <span className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Subject</span>
                        </div>
                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">{content.subject}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <DollarSign className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                          <span className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Price</span>
                        </div>
                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                          {formatPrice(content.price, content.currency)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <FileText className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                          <span className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Plagiarism</span>
                        </div>
                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                          {content.plagiarismScore ?? 'N/A'}%
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                          <span className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Uploaded</span>
                        </div>
                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                          {formatDate(content.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    {content.tags && content.tags.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Tag className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                          <span className="text-sm font-medium text-[#171717] dark:text-[#fafafa]">Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {content.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2.5 py-1 bg-gray-100 dark:bg-[#2E2E2E] text-[#171717] dark:text-[#fafafa] rounded-lg text-xs font-medium"
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
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {actionLoading[content._id] === 'approving' ? (
                        <>
                          <LoaderSpinner size="sm" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleReject(content._id)}
                      disabled={actionLoading[content._id]}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {actionLoading[content._id] === 'rejecting' ? (
                        <>
                          <LoaderSpinner size="sm" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminMarketplace;
