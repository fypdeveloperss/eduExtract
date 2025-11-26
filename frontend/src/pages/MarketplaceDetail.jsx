import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import { Flag, AlertTriangle, X, Trash2 } from 'lucide-react';
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
  const [confirmingCheckout, setConfirmingCheckout] = useState(false);
  const confirmingRef = useRef(false);
  
  // Flag states
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagDescription, setFlagDescription] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [hasFlagged, setHasFlagged] = useState(false);
  const [flagSuccess, setFlagSuccess] = useState('');

  useEffect(() => {
    fetchContentDetails();
    if (user) {
      fetchAccessInfo();
      fetchFlagStatus();
    }
  }, [id, user]);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');
    const sessionId = params.get('session_id');
    if (checkoutStatus === 'success' && sessionId && !confirmingRef.current) {
      confirmCheckoutSession(sessionId);
    }
  }, [user, id]);

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

  const fetchFlagStatus = async () => {
    try {
      const response = await api.get(`/api/marketplace/content/${id}/flag-status`);
      setHasFlagged(response.data.hasFlagged);
    } catch (error) {
      console.error('Failed to fetch flag status:', error);
    }
  };

  const handleFlag = async () => {
    if (!flagReason) {
      return;
    }
    
    try {
      setFlagging(true);
      const response = await api.post(`/api/marketplace/content/${id}/flag`, {
        reason: flagReason,
        description: flagDescription
      });
      
      if (response.data.success) {
        setHasFlagged(true);
        setShowFlagModal(false);
        setFlagReason('');
        setFlagDescription('');
        setFlagSuccess('Content has been flagged for review. Thank you for helping keep our marketplace safe.');
        setTimeout(() => setFlagSuccess(''), 5000);
      }
    } catch (error) {
      console.error('Failed to flag content:', error);
      setError(error.response?.data?.error || 'Failed to flag content');
    } finally {
      setFlagging(false);
    }
  };

  const handleUnflag = async () => {
    try {
      setFlagging(true);
      const response = await api.delete(`/api/marketplace/content/${id}/flag`);
      
      if (response.data.success) {
        setHasFlagged(false);
        setFlagSuccess('Your flag has been removed.');
        setTimeout(() => setFlagSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Failed to unflag content:', error);
      setError(error.response?.data?.error || 'Failed to remove flag');
    } finally {
      setFlagging(false);
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

  const confirmCheckoutSession = async (sessionId) => {
    try {
      confirmingRef.current = true;
      setConfirmingCheckout(true);
      const response = await api.post('/api/marketplace/checkout/confirm', { sessionId });
      if (response.data?.success) {
        handlePurchaseSuccess(response.data);
      }
    } catch (error) {
      console.error('Failed to confirm checkout session:', error);
      setError(error.response?.data?.error || 'Unable to verify payment. Please contact support.');
    } finally {
      setConfirmingCheckout(false);
      confirmingRef.current = false;
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('checkout');
      newUrl.searchParams.delete('session_id');
      window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
    }
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
    try {
      setDeleting(true);
      await api.delete(`/api/marketplace/content/${id}`);
      
      // Show success message and redirect
      setShowDeleteConfirm(false);
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

  const highlightStats = [
    {
      label: 'Total Views',
      value: (content?.views || 0).toLocaleString(),
      hint: 'Learners reached'
    },
    {
      label: 'Likes & Saves',
      value: (content?.likes || 0).toLocaleString(),
      hint: 'Community interest'
    },
    {
      label: 'Average Rating',
      value: content?.averageRating ? `${content.averageRating}/5` : 'No ratings yet',
      hint: 'Learner feedback'
    },
    {
      label: 'Originality Score',
      value:
        content?.plagiarismScore !== undefined
          ? `${Math.max(0, 100 - content.plagiarismScore)}%`
          : 'Pending',
      hint: 'Plagiarism report'
    }
  ];

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
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0d0d0d] py-6 md:py-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8 text-sm md:text-base">
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

        {/* Hero + Summary */}
        <section className="bg-gradient-to-br from-[#171717] via-[#1f1f1f] to-[#2b2b2b] text-white rounded-3xl shadow-2xl border border-[#2a2a2a] p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-4xl">{getCategoryIcon(content.category)}</span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold capitalize">
                  {content.category || 'Uncategorized'}
                </span>
                {content.difficulty && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold capitalize">
                    {content.difficulty}
                  </span>
                )}
                {content.contentType && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold capitalize">
                    {content.contentType}
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-3">{content.title}</h1>
              <p className="text-base md:text-lg text-white/80 leading-relaxed mb-6">
                {content.description}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {highlightStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <p className="text-xs uppercase tracking-wide text-white/60">{stat.label}</p>
                    <p className="text-lg font-semibold">{stat.value}</p>
                    <p className="text-[11px] text-white/60">{stat.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full lg:max-w-sm">
              <div className="bg-white text-[#171717] rounded-2xl shadow-2xl p-6 space-y-4 border border-gray-100">
                <div>
                  <p className="text-xs font-semibold text-[#17171799] uppercase tracking-wide">
                    Access this resource
                  </p>
                  <p className="text-4xl font-bold mt-2">
                    {formatPrice(content.price, content.currency)}
                  </p>
                  <p className="text-sm text-[#17171799]">
                    {content.price === 0 ? 'Instant download' : 'One-time premium purchase'}
                  </p>
                </div>

                {!user ? (
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full px-6 py-3 bg-[#171717] text-white rounded-xl hover:opacity-90 transition-opacity font-semibold"
                  >
                    Sign in to Access
                  </button>
                ) : canAccessContent ? (
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full px-6 py-3 bg-[#171717] text-white rounded-xl hover:opacity-90 transition-opacity font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {downloading ? (
                      <>
                        <LoaderSpinner size="sm" />
                        Preparing download...
                      </>
                    ) : (
                      <>
                        <span>⬇️</span>
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
                    disabled={confirmingCheckout}
                    className="w-full px-6 py-3 border border-gray-200 bg-white text-[#171717] rounded-xl hover:bg-gray-50 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>💳</span>
                    {confirmingCheckout ? 'Confirming purchase...' : 'Purchase Now'}
                  </button>
                )}

                {confirmingCheckout && (
                  <p className="text-xs text-[#17171799] flex items-center gap-2">
                    <LoaderSpinner size="sm" />
                    Finalizing your payment...
                  </p>
                )}

                {purchaseSuccess && (
                  <div className="text-xs text-emerald-600 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    {purchaseSuccess}
                  </div>
                )}

                {flagSuccess && (
                  <div className="text-xs text-blue-600 bg-blue-50 rounded-xl p-3 border border-blue-100">
                    {flagSuccess}
                  </div>
                )}

                {user && content.creatorId === user.uid && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleting}
                    className="w-full px-6 py-2.5 border border-red-200 dark:border-red-800 bg-white dark:bg-[#171717] text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Delete Content
                  </button>
                )}

                {/* Flag Button - visible for all logged-in users except content owner */}
                {user && content.creatorId !== user.uid && (
                  <button
                    onClick={hasFlagged ? handleUnflag : () => setShowFlagModal(true)}
                    disabled={flagging}
                    className={`w-full px-6 py-2.5 border rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                      hasFlagged 
                        ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' 
                        : 'border-gray-200 bg-white text-[#171717cc] hover:bg-gray-50'
                    }`}
                  >
                    {flagging ? (
                      <>
                        <LoaderSpinner size="sm" />
                        {hasFlagged ? 'Removing flag...' : 'Flagging...'}
                      </>
                    ) : (
                      <>
                        <Flag size={16} className={hasFlagged ? 'fill-red-500' : ''} />
                        {hasFlagged ? 'Flagged - Click to Remove' : 'Report Content'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main Body */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl border border-gray-200 dark:border-[#fafafa1a] shadow-xl p-6 md:p-8 space-y-8">
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
                        type: content.contentType,
                        contentData: content.contentData || content.description
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

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#171717] rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#2E2E2E] bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Trash2 size={20} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">Delete Content</h3>
                    <p className="text-xs text-[#171717cc] dark:text-[#fafafacc]">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors disabled:opacity-50"
                >
                  <X size={20} className="text-[#171717cc] dark:text-[#fafafacc]" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 space-y-4">
                <p className="text-[#171717cc] dark:text-[#fafafacc]">
                  Are you sure you want to delete <span className="font-semibold text-[#171717] dark:text-[#fafafa]">"{content?.title}"</span>?
                </p>
                
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                  <p className="text-xs text-red-800 dark:text-red-200 flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      This will permanently remove the content from the marketplace. All associated data including reviews and purchase records will be affected.
                    </span>
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1E1E1E]">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] font-medium hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <LoaderSpinner size="sm" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete Content
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Flag Content Modal */}
        {showFlagModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#171717] rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#2E2E2E] bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">Report Content</h3>
                    <p className="text-xs text-[#171717cc] dark:text-[#fafafacc]">Help us maintain quality</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFlagModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors"
                >
                  <X size={20} className="text-[#171717cc] dark:text-[#fafafacc]" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                    Reason for reporting *
                  </label>
                  <select
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#1E1E1E] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  >
                    <option value="">Select a reason</option>
                    <option value="inappropriate">Inappropriate content</option>
                    <option value="copyright">Copyright violation</option>
                    <option value="spam">Spam or misleading</option>
                    <option value="misleading">Misleading title/description</option>
                    <option value="low_quality">Low quality content</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                    Additional details (optional)
                  </label>
                  <textarea
                    value={flagDescription}
                    onChange={(e) => setFlagDescription(e.target.value)}
                    placeholder="Provide more context about the issue..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#1E1E1E] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
                  />
                  <p className="text-xs text-[#171717cc] dark:text-[#fafafacc] mt-1 text-right">
                    {flagDescription.length}/500
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      False reports may result in account restrictions. Please only report genuine issues.
                    </span>
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1E1E1E]">
                <button
                  onClick={() => setShowFlagModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] font-medium hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFlag}
                  disabled={!flagReason || flagging}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {flagging ? (
                    <>
                      <LoaderSpinner size="sm" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Flag size={16} />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );

}

export default MarketplaceDetail;


