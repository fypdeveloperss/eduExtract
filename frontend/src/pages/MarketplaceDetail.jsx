import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import PaymentModal from '../components/PaymentModal';
import ContentDetail from '../components/ContentDetail';

function MarketplaceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [content, setContent] = useState(null);
  const [creator, setCreator] = useState(null);
  const [creatorStats, setCreatorStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [accessInfo, setAccessInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchContentDetails();
    if (user) {
      fetchAccessInfo();
    }
  }, [id, user]);

  const fetchContentDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/marketplace/content/${id}`);
      setContent(response.data.content);
      setCreator(response.data.creator);
      setCreatorStats(response.data.creatorStats);
      setReviews(response.data.reviews || []);
    } catch (error) {
      console.error('Failed to fetch content:', error);
      setError('Failed to load content details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessInfo = async () => {
    try {
      const response = await api.get(`/api/marketplace/content/${id}/access`);
      setAccessInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch access info:', error);
    }
  };

  const handlePurchaseSuccess = (purchaseData) => {
    setPurchaseSuccess('Purchase successful! You now have access to this content.');
    setShowPaymentModal(false);
    // Refresh access info
    setTimeout(() => {
      fetchAccessInfo();
      setPurchaseSuccess('');
    }, 3000);
  };

  const handleDownload = async () => {
    if (!accessInfo?.hasAccess) {
      setError('You need to purchase this content to download it.');
      return;
    }

    try {
      setDownloading(true);
      
      if (content.filePath) {
        // For file uploads, create a download link
        const response = await api.get(`/api/marketplace/content/${id}/download`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', content.contentData?.originalName || 'download');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // For text content, create a text file
        const contentText = typeof content.contentData === 'string' 
          ? content.contentData 
          : JSON.stringify(content.contentData, null, 2);
        
        const blob = new Blob([contentText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${content.title}.txt`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download content. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/api/marketplace/content/${id}`);
      
      // Show success message and redirect
      setError('Content deleted successfully. Redirecting to marketplace...');
      setTimeout(() => {
        navigate('/marketplace');
      }, 2000);
    } catch (error) {
      console.error('Failed to delete content:', error);
      setError(error.response?.data?.error || 'Failed to delete content');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] flex items-center justify-center">
        <div className="bg-white dark:bg-[#171717] rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-2">Content Not Found</h2>
          <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">{error || 'The content you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const canAccessContent = accessInfo?.hasAccess || content.price === 0;

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-[#171717cc] dark:text-[#fafafacc]">
            <li>
              <button
                onClick={() => navigate('/marketplace')}
                className="hover:text-blue-600 transition-colors"
              >
                Marketplace
              </button>
            </li>
            <li className="text-[#171717cc] dark:text-[#fafafacc]">/</li>
            <li className="text-[#171717cc] dark:text-[#fafafacc] font-medium">{content.title}</li>
          </ol>
        </nav>

        {/* Main Content */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-4xl">{getCategoryIcon(content.category)}</span>
                  <div>
                    <span className="bg-white dark:bg-[#171717] bg-opacity-20 dark:bg-opacity-40 px-3 py-1 rounded-full text-sm text-[#171717cc] dark:text-[#fafafacc]">
                      {content.category}
                    </span>
                    <span className={`ml-2 px-3 py-1 rounded-full text-sm ${getDifficultyColor(content.difficulty)}`}>
                      {content.difficulty}
                    </span>
                  </div>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">{content.title}</h1>
                <p className="text-xl text-blue-100 mb-6">{content.description}</p>
                
                <div className="flex items-center space-x-6 text-blue-100">
                  <span className="flex items-center">
                    <span className="mr-2">📚</span>
                    {content.subject}
                  </span>
                  <span className="flex items-center">
                    <span className="mr-2">👁️</span>
                    {content.views || 0} views
                  </span>
                  <span className="flex items-center">
                    <span className="mr-2">❤️</span>
                    {content.likes || 0} likes
                  </span>
                  <span className="flex items-center">
                    <span className="mr-2">⭐</span>
                    {content.averageRating ? `${content.averageRating}/5` : 'No ratings'}
                  </span>
                </div>
              </div>
              
              {/* Price and Action */}
              <div className="text-center ml-8">
                <div className="bg-white dark:bg-[#171717] bg-opacity-20 dark:bg-opacity-40 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="text-3xl font-bold mb-2 text-[#171717cc] dark:text-[#fafafacc]">
                    {formatPrice(content.price, content.currency)}
                  </div>
                  <div className="text-[#171717cc] dark:text-[#fafafacc] text-sm mb-4">
                    {content.price === 0 ? 'Free for everyone' : 'One-time purchase'}
                  </div>
                  
                  {!user ? (
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full bg-white text-blue-600 py-3 px-6 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                    >
                      Sign in to Access
                    </button>
                  ) : canAccessContent ? (
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      {downloading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <span className="mr-2">⬇️</span>
                          Download Content
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
                    >
                      <span className="mr-2">💳</span>
                      Purchase Now
                    </button>
                  )}

                  {/* Delete Button for Content Creator */}
                  {user && content.creatorId === user.uid && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      {deleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <span className="mr-2">🗑️</span>
                          Delete Content
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-xl p-6 mb-8">
                  <h3 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
                    <span className="mr-2">📄</span>
                    Content Preview
                  </h3>
                  
                  {canAccessContent ? (
                    <div>
                      {content.filePath ? (
                        <div className="bg-white rounded-lg p-4 border">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-2xl">📎</span>
                            <div>
                              <div className="font-medium text-[#171717cc] dark:text-[#171717cc]">{content.contentData?.originalName || 'Document'}</div>
                              <div className="text-sm text-gray-500">
                                {content.contentData?.size ? `${(content.contentData.size / 1024 / 1024).toFixed(2)} MB` : ''}
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm">
                            This is a document file. Click the download button above to access the full content.
                          </p>
                        </div>
                      ) : (
                        <ContentDetail content={{
                          ...content,
                          type: content.contentType, // Map contentType to type for ContentDetail compatibility
                          contentData: content.contentData || content.description // Fallback to description if contentData is empty
                        }} />
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-6 border text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🔒</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Content Locked</h4>
                      <p className="text-gray-600 mb-4">
                        Purchase this content to unlock full access and download capabilities.
                      </p>
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <span className="mr-2">💳</span>
                        Purchase for {formatPrice(content.price, content.currency)}
                      </button>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {content.tags && content.tags.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {content.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews Section */}
                <div>
                  <h3 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
                    <span className="mr-2">⭐</span>
                    Reviews ({reviews.length})
                  </h3>
                  
                  {reviews.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-lg p-6 text-center">
                      <p className="text-[#171717cc] dark:text-[#fafafacc]">No reviews yet. Be the first to review this content!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review._id} className="bg-gray-50 dark:bg-[#2E2E2E] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                                by {review.reviewerName || 'Anonymous'}
                              </span>
                            </div>
                            <span className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {review.review && (
                            <p className="text-[#171717cc] dark:text-[#fafafacc]">{review.review}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Creator Info */}
                {creator && (
                  <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
                      <span className="mr-2">👤</span>
                      Creator
                    </h3>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">👤</span>
                      </div>
                      <div className="font-medium text-[#171717cc] dark:text-[#fafafacc]">{creator.name || 'Anonymous'}</div>
                      <div className="text-sm text-[#171717cc] dark:text-[#fafafacc]">{creator.email}</div>
                      
                      {creatorStats && (
                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#171717cc] dark:text-[#fafafacc]">Reputation:</span>
                            <span className="font-medium text-[#171717cc] dark:text-[#fafafacc]">{creatorStats.reputationLevel || 'New'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#171717cc] dark:text-[#fafafacc]">Uploads:</span>
                            <span className="font-medium text-[#171717cc] dark:text-[#fafafacc]">{creatorStats.totalUploads || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#171717cc] dark:text-[#fafafacc]">Views:</span>
                            <span className="font-medium text-[#171717cc] dark:text-[#fafafacc]">{creatorStats.totalViews || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Content Stats */}
                <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
                    <span className="mr-2">📊</span>
                    Content Stats
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#171717cc] dark:text-[#fafafacc]">Type:</span>
                      <span className="font-medium capitalize text-[#171717cc] dark:text-[#fafafacc]">{content.contentType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#171717cc] dark:text-[#fafafacc]">Created:</span>
                      <span className="font-medium text-[#171717cc] dark:text-[#fafafacc]">
                        {new Date(content.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#171717cc] dark:text-[#fafafacc]">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        content.status === 'approved' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {content.status}
                      </span>
                    </div>
                    {content.plagiarismScore !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-[#171717cc] dark:text-[#fafafacc]">Originality:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          content.plagiarismScore < 30 ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                          content.plagiarismScore < 70 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                          'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                        }`}>
                          {100 - content.plagiarismScore}% Original
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purchase Success Message */}
                {purchaseSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-green-700 text-sm">{purchaseSuccess}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <PaymentModal
            content={content}
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={handlePurchaseSuccess}
          />
        )}
      </div>
    </div>
  );
}

export default MarketplaceDetail;


