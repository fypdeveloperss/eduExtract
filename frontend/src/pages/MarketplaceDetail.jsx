import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import PaymentModal from '../components/PaymentModal';
import ContentDetail from '../components/ContentDetail';
import ReviewSection from '../components/ReviewSection';
import PageLoader from '../components/PageLoader';
import LoaderSpinner from '../components/LoaderSpinner';

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
        // For educational content, generate PDF using the same logic as ContentDetail
        let endpoint = '';
        let payload = {};
        let filename = '';

        switch (content.contentType) {
          case 'blog':
            endpoint = '/download-blog';
            payload = { blogContent: content.contentData, title: content.title };
            filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            break;
          case 'summary':
            endpoint = '/download-summary';
            payload = { summary: content.contentData, title: content.title };
            filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            break;
          case 'quiz':
            endpoint = '/download-quiz';
            payload = { quiz: content.contentData, title: content.title };
            filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            break;
          case 'flashcards':
            endpoint = '/download-flashcards';
            payload = { flashcards: content.contentData, title: content.title };
            filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            break;
          case 'slides':
            // For slides, call the backend to generate a properly formatted PowerPoint
            try {
              const response = await api.post('/generate-slides', {
                url: content.url || 'file-upload',
                slides: content.contentData
              }, {
                responseType: 'blob'
              });

              // Create download link for PowerPoint file
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`);
              document.body.appendChild(link);
              link.click();
              link.remove();
              window.URL.revokeObjectURL(url);
              return;
            } catch (error) {
              console.error('PowerPoint generation failed:', error);
              // Fallback to text download
              if (content.contentData && Array.isArray(content.contentData)) {
                let slidesText = `${content.title}\n\n`;
                content.contentData.forEach((slide, index) => {
                  slidesText += `Slide ${index + 1}: ${slide.title}\n`;
                  slide.points.forEach((point, pointIndex) => {
                    slidesText += `  ${pointIndex + 1}. ${point}\n`;
                  });
                  slidesText += '\n';
                });
                
                const blob = new Blob([slidesText], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                return;
              } else {
                setError('No slides data available for download');
                return;
              }
            }
          case 'document':
          case 'personal':
          default:
            // For other content types, fallback to text file download
            const contentText = typeof content.contentData === 'string' 
              ? content.contentData 
              : JSON.stringify(content.contentData, null, 2);
            
            const blob = new Blob([contentText], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            return;
        }

        // For supported content types, make API call to generate PDF
        if (endpoint) {
          const response = await api.post(endpoint, payload, {
            responseType: 'blob'
          });

          // Create download link
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Download failed:', error);
      setError(`Failed to download ${content.contentType}: ${error.message || 'Please try again.'}`);
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

  const getDifficultyClass = () =>
    'bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#fafafacc1a] text-[#171717cc] dark:text-[#fafafacc]';

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
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center px-4">
        <div className="flex flex-col items-center space-y-3 text-center text-[#171717cc] dark:text-[#fafafacc]">
          <LoaderSpinner size="xl" />
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center">
        <div className="bg-white dark:bg-[#171717] rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-2">Content Not Found</h2>
          <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">{error || 'The content you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="px-6 py-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-semibold"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const canAccessContent = accessInfo?.hasAccess || content.price === 0;

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-[#171717cc] dark:text-[#fafafacc]">
            <li>
              <button
                onClick={() => navigate('/marketplace')}
                className="hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors"
              >
                Marketplace
              </button>
            </li>
            <li className="text-[#171717cc] dark:text-[#fafafacc]">/</li>
            <li className="text-[#171717cc] dark:text-[#fafafacc] font-medium">{content.title}</li>
          </ol>
        </nav>

        {/* Main Content */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-gray-200 dark:border-[#fafafa1a] shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="p-6 md:p-8 border-b border-gray-200 dark:border-[#fafafa1a] bg-gray-50 dark:bg-[#1E1E1E]">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-3xl">{getCategoryIcon(content.category)}</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] capitalize">
                    {content.category || 'Uncategorized'}
                  </span>
                  {content.difficulty && (
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getDifficultyClass()}`}>
                      {content.difficulty}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-[#171717] dark:text-[#fafafa] mb-3">{content.title}</h1>
                <p className="text-base md:text-lg text-[#171717cc] dark:text-[#fafafacc] mb-6">{content.description}</p>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                  <span className="flex items-center gap-2">
                    <span>📚</span>
                    {content.subject || 'No subject listed'}
                  </span>
                  <span className="flex items-center gap-2">
                    <span>👁️</span>
                    {content.views || 0} views
                  </span>
                  <span className="flex items-center gap-2">
                    <span>❤️</span>
                    {content.likes || 0} likes
                  </span>
                  <span className="flex items-center gap-2">
                    <span>⭐</span>
                    {content.averageRating ? `${content.averageRating}/5` : 'No ratings'}
                  </span>
                </div>
              </div>

              {/* Price and Action */}
              <div className="w-full lg:max-w-sm">
                <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl p-6 shadow-sm">
                  <div className="text-3xl font-bold mb-1 text-[#171717] dark:text-[#fafafa]">
                    {formatPrice(content.price, content.currency)}
                  </div>
                  <div className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-4">
                    {content.price === 0 ? 'Free for everyone' : 'One-time purchase'}
                  </div>

                  {!user ? (
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full px-6 py-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-semibold"
                    >
                      Sign in to Access
                    </button>
                  ) : canAccessContent ? (
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="w-full px-6 py-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {downloading ? (
                        <>
                          <LoaderSpinner size="sm" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <span>📄</span>
                          {['blog', 'summary', 'quiz', 'flashcards'].includes(content.contentType)
                            ? 'Download PDF'
                            : content.contentType === 'slides'
                              ? 'Download PPTX'
                              : 'Download Content'}
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full px-6 py-3 border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <span>💳</span>
                      Purchase Now
                    </button>
                  )}

                  {/* Delete Button for Content Creator */}
                  {user && content.creatorId === user.uid && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="w-full mt-3 px-6 py-2 border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {deleting ? (
                        <>
                          <LoaderSpinner size="sm" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <span>🗑️</span>
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
          <div className="p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
                    <span className="mr-2">📄</span>
                    Content Preview
                  </h3>
                  
                  {canAccessContent ? (
                    <div>
                      {content.filePath ? (
                        <div className="bg-white dark:bg-[#171717] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-2xl">📎</span>
                            <div>
                              <div className="font-medium text-[#171717cc] dark:text-[#fafafacc]">{content.contentData?.originalName || 'Document'}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {content.contentData?.size ? `${(content.contentData.size / 1024 / 1024).toFixed(2)} MB` : ''}
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 text-sm">
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
                    <div className="bg-white dark:bg-[#171717] rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🔒</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Content Locked</h4>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Purchase this content to unlock full access and download capabilities.
                      </p>
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="px-6 py-3 border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors font-medium flex items-center gap-2 justify-center"
                      >
                        <span>💳</span>
                        Purchase for {formatPrice(content.price, content.currency)}
                      </button>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {content.tags && content.tags.length > 0 && (
                  <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {content.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 rounded-full text-sm border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews Section */}
                <ReviewSection 
                  contentId={id}
                  hasAccess={canAccessContent}
                  onReviewSubmitted={fetchContentDetails}
                />
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Creator Info */}
                {creator && (
                  <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4 flex items-center">
                      <span className="mr-2">👤</span>
                      Creator
                    </h3>
                    <div className="text-center">
                      <div className="w-16 h-16 border border-gray-200 dark:border-[#2E2E2E] bg-gray-100 dark:bg-[#1E1E1E] rounded-full flex items-center justify-center mx-auto mb-3">
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
                <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-6 shadow-sm">
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
                      <span className="px-2 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] capitalize">
                        {content.status}
                      </span>
                    </div>
                    {content.plagiarismScore !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-[#171717cc] dark:text-[#fafafacc]">Originality:</span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]">
                          {100 - content.plagiarismScore}% Original
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purchase Success Message */}
                {purchaseSuccess && (
                  <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                    {purchaseSuccess}
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


