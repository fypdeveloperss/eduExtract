import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import { Download } from 'lucide-react';
import api from '../utils/axios';
import MarketplaceContentSelectionModal from './MarketplaceContentSelectionModal';
import { authenticatedFetch } from '../utils/auth';

const MyContent = () => {
  const { user } = useAuth();
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedContentForPublish, setSelectedContentForPublish] = useState(null);
  const [downloadingItems, setDownloadingItems] = useState(new Set());
  const [activeTab, setActiveTab] = useState('all');
  const [quizFilter, setQuizFilter] = useState('unsolved'); // 'solved' or 'unsolved'
  const [quizAttempts, setQuizAttempts] = useState([]);

  useEffect(() => {
    const fetchContent = async () => {
      if (!user) {
        setError('Please sign in to view your content.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/api/content`);
        setContentList(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch content.');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [user]);

  // Fetch quiz attempts
  useEffect(() => {
    const fetchQuizAttempts = async () => {
      if (!user) return;
      try {
        const res = await api.get('/api/content/user/quiz-attempts');
        console.log('Quiz attempts fetched:', res.data);
        setQuizAttempts(res.data);
      } catch (err) {
        console.error('Failed to fetch quiz attempts:', err);
      }
    };
    fetchQuizAttempts();
  }, [user]);

  const handlePublishToMarketplace = (content) => {
    setSelectedContentForPublish(content);
    setShowPublishModal(true);
  };

  const handlePublishContent = async (contentItems) => {
    try {
      const response = await authenticatedFetch('/api/marketplace/publish-existing', {
        method: 'POST',
        body: JSON.stringify({ contentItems }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to publish content');
      }

      // Show success message
      if (result.summary) {
        const { successful, failed, total } = result.summary;
        const approvedCount = result.results.filter(r => r.success && r.status === 'approved').length;
        const pendingCount = result.results.filter(r => r.success && r.status === 'pending').length;
        
        if (failed > 0) {
          alert(`Published ${successful} out of ${total} items. ${failed} items failed to publish. Check console for details.`);
          console.log('Failed items:', result.results.filter(r => !r.success));
        } else {
          let message = `Successfully published ${successful} items to the marketplace!`;
          if (approvedCount > 0) {
            message += `\n✅ ${approvedCount} items are now live and visible.`;
          }
          if (pendingCount > 0) {
            message += `\n⏳ ${pendingCount} items are pending admin approval.`;
          }
          alert(message);
        }
      }
    } catch (error) {
      console.error('Error publishing content:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDownload = async (content) => {
    const contentId = content._id;
    setDownloadingItems(prev => new Set(prev).add(contentId));
    
    try {
      let endpoint = '';
      let payload = {};
      let filename = '';

      switch (content.type) {
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
          endpoint = '/download-slides';
          payload = { slides: content.contentData, title: content.title };
          filename = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`;
          break;
        default:
          alert(`Download not supported for content type: ${content.type}`);
          return;
      }

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

    } catch (error) {
      console.error('Download failed:', error);
      alert(`Failed to download ${content.type}: ${error.message || 'Please try again.'}`);
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(contentId);
        return newSet;
      });
    }
  };

  if (loading) return <div className="text-center mt-8">Loading your content...</div>;
  if (error) return <div className="text-center text-red-500 mt-8">{error}</div>;
  if (!contentList.length) return <div className="text-center mt-8">No content found.</div>;

  // Group content by type
  const groupedContent = contentList.reduce((acc, item) => {
    const type = item.type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(item);
    return acc;
  }, {});

  // Filter content based on active tab
  const getFilteredContent = () => {
    if (activeTab === 'all') {
      return contentList;
    }
    
    let filtered = contentList.filter(item => (item.type || 'other') === activeTab);
    
    // Apply quiz filter if we're viewing quizzes
    if (activeTab === 'quiz') {
      if (quizFilter === 'solved') {
        filtered = filtered.filter(item => isQuizSolved(item._id));
      } else if (quizFilter === 'unsolved') {
        filtered = filtered.filter(item => !isQuizSolved(item._id));
      }
    }
    
    return filtered;
  };

  // Check if a quiz has been solved
  const isQuizSolved = (quizId) => {
    console.log('Checking if quiz is solved:', quizId);
    console.log('Quiz attempts:', quizAttempts);
    const isSolved = quizAttempts.some(attempt => {
      // Handle both cases: quizId as string or as populated object
      const attemptQuizId = attempt.quizId._id ? attempt.quizId._id.toString() : attempt.quizId.toString();
      console.log('Comparing:', attemptQuizId, 'with', quizId.toString());
      return attemptQuizId === quizId.toString();
    });
    console.log('Is solved:', isSolved);
    return isSolved;
  };

  // Get quiz attempt for a specific quiz
  const getQuizAttempt = (quizId) => {
    return quizAttempts.find(attempt => {
      // Handle both cases: quizId as string or as populated object
      const attemptQuizId = attempt.quizId._id ? attempt.quizId._id.toString() : attempt.quizId.toString();
      return attemptQuizId === quizId.toString();
    });
  };

  const filteredContent = getFilteredContent();

  // Define content type configurations
  const contentTypeConfig = {
    blog: {
      title: 'Blog Posts',
      icon: '📝',
      color: 'blue',
      description: 'Educational articles and blog posts'
    },
    summary: {
      title: 'Summaries',
      icon: '📄',
      color: 'green',
      description: 'Content summaries and overviews'
    },
    quiz: {
      title: 'Quizzes',
      icon: '❓',
      color: 'purple',
      description: 'Interactive quiz questions and answers'
    },
    flashcards: {
      title: 'Flashcards',
      icon: '🎴',
      color: 'orange',
      description: 'Study cards for learning and memorization'
    },
    slides: {
      title: 'Presentations',
      icon: '📊',
      color: 'red',
      description: 'Slide presentations and visual content'
    },
    other: {
      title: 'Other Content',
      icon: '📁',
      color: 'gray',
      description: 'Miscellaneous content types'
    }
  };

  const getTypeColor = (color) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
      purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
      orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200',
      red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
      gray: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200'
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Content</h2>
          <p className="text-gray-600 dark:text-gray-300">Manage and organize your generated educational content</p>
        </div>
        {contentList.length > 0 && (
          <button
            onClick={() => setShowPublishModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            <span className="mr-2">📚</span>
            Publish to Marketplace
          </button>
        )}
      </div>
      
      {/* Content Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {Object.entries(groupedContent).map(([type, items]) => {
          const config = contentTypeConfig[type] || contentTypeConfig.other;
          return (
            <div key={type} className={`${getTypeColor(config.color)} rounded-lg p-4 border`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-75">{config.title}</p>
                  <p className="text-2xl font-bold">{items.length}</p>
                </div>
                <span className="text-2xl">{config.icon}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Type Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-[#121212] dark:bg-[#171717] text-[#fafafacc] border-b-2 border-blue-500'
                : 'bg-white dark:bg-[#121212] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#171717]'
            }`}
          >
            <span className="mr-2">📚</span>
            All Content ({contentList.length})
          </button>
          {Object.entries(groupedContent).map(([type, items]) => {
            const config = contentTypeConfig[type] || contentTypeConfig.other;
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                  activeTab === type
                    ? 'bg-[#121212] dark:bg-[#171717] text-[#fafafacc] border-b-2 border-blue-500'
                    : 'bg-white dark:bg-[#121212] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#171717]'
                }`}
              >
                <span className="mr-2">{config.icon}</span>
                {config.title} ({items.length})
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtered Content Display */}
      {activeTab === 'all' ? (
        /* Show all content grouped by type */
        Object.entries(groupedContent).map(([type, items]) => {
          const config = contentTypeConfig[type] || contentTypeConfig.other;
          return (
            <div key={type} className="mb-8">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">{config.icon}</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{config.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{config.description}</p>
                </div>
                <div className="ml-auto">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(config.color)}`}>
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>
              
              <div className="grid gap-4">
                {items.map(item => (
                  <div key={item._id} className="bg-white dark:bg-[#171717] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1">
                        <Link 
                          to={`/content/${item._id}`} 
                          className="text-lg font-semibold text-gray-900 dark:text-[#fafafacc] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {item.title}
                        </Link>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                          <span className="flex items-center gap-1">
                            <span>{config.icon}</span>
                            <span className="capitalize">{item.type}</span>
                          </span>
                          <span>•</span>
                          <span>Created {new Date(item.createdAt).toLocaleDateString()}</span>
                          {item.url && (
                            <>
                              <span>•</span>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                View Source
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 mt-4 lg:mt-0 lg:ml-6">
                        <Link
                          to={`/content/${item._id}`}
                          className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <span className="mr-1">👁️</span>
                          View
                        </Link>
                        
                        <button
                          onClick={() => handleDownload(item)}
                          disabled={downloadingItems.has(item._id)}
                          className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Download size={14} className="mr-1" />
                          {downloadingItems.has(item._id) ? 'Downloading...' : 'Download'}
                        </button>
                        
                        <button
                          onClick={() => handlePublishToMarketplace(item)}
                          className="inline-flex items-center justify-center bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                        >
                          <span className="mr-1">🚀</span>
                          Publish
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        /* Show filtered content for specific type */
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">{contentTypeConfig[activeTab]?.icon || '📁'}</span>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {contentTypeConfig[activeTab]?.title || 'Content'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {contentTypeConfig[activeTab]?.description || 'Filtered content'}
              </p>
            </div>
            <div className="ml-auto">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(contentTypeConfig[activeTab]?.color || 'gray')}`}>
                {filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>
          
          {/* Quiz filter buttons - only show for quiz tab */}
          {activeTab === 'quiz' && (
            <div className="mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setQuizFilter('unsolved')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    quizFilter === 'unsolved'
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-2 border-purple-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="mr-2">❓</span>
                  Unsolved ({contentList.filter(item => {
                    if (item.type === 'quiz') {
                      const solved = isQuizSolved(item._id);
                      console.log(`Quiz ${item._id} solved:`, solved);
                      return !solved;
                    }
                    return false;
                  }).length})
                </button>
                <button
                  onClick={() => setQuizFilter('solved')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    quizFilter === 'solved'
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-2 border-green-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="mr-2">✅</span>
                  Solved ({contentList.filter(item => {
                    if (item.type === 'quiz') {
                      const solved = isQuizSolved(item._id);
                      console.log(`Quiz ${item._id} solved:`, solved);
                      return solved;
                    }
                    return false;
                  }).length})
                </button>
              </div>
            </div>
          )}
          
          <div className="grid gap-4">
            {filteredContent.map(item => {
              const config = contentTypeConfig[item.type] || contentTypeConfig.other;
              return (
                <div key={item._id} className="bg-white dark:bg-[#171717] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <Link 
                        to={`/content/${item._id}`} 
                        className="text-lg font-semibold text-gray-900 dark:text-[#fafafacc] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {item.title}
                      </Link>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                        <span className="flex items-center gap-1">
                          <span>{config.icon}</span>
                          <span className="capitalize">{item.type}</span>
                        </span>
                        <span>•</span>
                        <span>Created {new Date(item.createdAt).toLocaleDateString()}</span>
                        {item.type === 'quiz' && isQuizSolved(item._id) && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <span>✅</span>
                              <span>Score: {getQuizAttempt(item._id)?.score}%</span>
                            </span>
                          </>
                        )}
                        {item.url && (
                          <>
                            <span>•</span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View Source
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 mt-4 lg:mt-0 lg:ml-6">
                      <Link
                        to={`/content/${item._id}`}
                        className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <span className="mr-1">👁️</span>
                        View
                      </Link>
                      
                      <button
                        onClick={() => handleDownload(item)}
                        disabled={downloadingItems.has(item._id)}
                        className="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Download size={14} className="mr-1" />
                        {downloadingItems.has(item._id) ? 'Downloading...' : 'Download'}
                      </button>
                      
                      <button
                        onClick={() => handlePublishToMarketplace(item)}
                        className="inline-flex items-center justify-center bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                      >
                        <span className="mr-1">🚀</span>
                        Publish
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Marketplace Content Selection Modal */}
      <MarketplaceContentSelectionModal
        isOpen={showPublishModal}
        onClose={() => {
          setShowPublishModal(false);
          setSelectedContentForPublish(null);
        }}
        onConfirm={handlePublishContent}
        preSelectedContent={selectedContentForPublish}
      />
    </div>
  );
};

export default MyContent; 