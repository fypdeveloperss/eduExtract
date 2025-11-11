import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { 
  Download, 
  FileText, 
  BookOpen, 
  HelpCircle, 
  Layers, 
  Presentation, 
  Folder,
  Eye,
  Rocket,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Clock,
  TrendingUp,
  Filter,
  Search,
  Grid3x3,
  List,
  MoreVertical,
  Sparkles
} from 'lucide-react';
import api from '../utils/axios';
import MarketplaceContentSelectionModal from './MarketplaceContentSelectionModal';
import { authenticatedFetch } from '../utils/auth';
import ContentSidebar from './ContentSidebar';

const MyContent = () => {
  const { user } = useAuth();
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedContentForPublish, setSelectedContentForPublish] = useState(null);
  const [downloadingItems, setDownloadingItems] = useState(new Set());
  const [activeTab, setActiveTab] = useState('all');
  const [quizFilter, setQuizFilter] = useState('unsolved');
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarContentId, setSidebarContentId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  useEffect(() => {
    const fetchQuizAttempts = async () => {
      if (!user) return;
      try {
        const res = await api.get('/api/content/user/quiz-attempts');
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

  const handleViewContent = (contentId) => {
    setSidebarContentId(contentId);
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    setSidebarContentId(null);
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

      if (result.summary) {
        const { successful, failed, total } = result.summary;
        const approvedCount = result.results.filter(r => r.success && r.status === 'approved').length;
        const pendingCount = result.results.filter(r => r.success && r.status === 'pending').length;
        
        if (failed > 0) {
          alert(`Published ${successful} out of ${total} items. ${failed} items failed to publish.`);
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

  const groupedContent = contentList.reduce((acc, item) => {
    const type = item.type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(item);
    return acc;
  }, {});

  const getFilteredContent = () => {
    let filtered = activeTab === 'all' 
      ? contentList 
      : contentList.filter(item => (item.type || 'other') === activeTab);
    
    if (activeTab === 'quiz') {
      if (quizFilter === 'solved') {
        filtered = filtered.filter(item => isQuizSolved(item._id));
      } else if (quizFilter === 'unsolved') {
        filtered = filtered.filter(item => !isQuizSolved(item._id));
      }
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const isQuizSolved = (quizId) => {
    return quizAttempts.some(attempt => {
      const attemptQuizId = attempt.quizId._id ? attempt.quizId._id.toString() : attempt.quizId.toString();
      return attemptQuizId === quizId.toString();
    });
  };

  const getQuizAttempt = (quizId) => {
    return quizAttempts.find(attempt => {
      const attemptQuizId = attempt.quizId._id ? attempt.quizId._id.toString() : attempt.quizId.toString();
      return attemptQuizId === quizId.toString();
    });
  };

  const filteredContent = getFilteredContent();

  const contentTypeConfig = {
    blog: {
      title: 'Blog Posts',
      icon: FileText,
      bgLight: 'bg-gray-50 dark:bg-[#1E1E1E]',
      borderColor: 'border-gray-200 dark:border-[#fafafa1a]',
      textColor: 'text-gray-700 dark:text-gray-300',
      iconBg: 'bg-gray-100 dark:bg-[#fafafa1a]',
      description: 'Educational articles and blog posts'
    },
    summary: {
      title: 'Summaries',
      icon: BookOpen,
      bgLight: 'bg-gray-50 dark:bg-[#1E1E1E]',
      borderColor: 'border-gray-200 dark:border-[#fafafa1a]',
      textColor: 'text-gray-700 dark:text-gray-300',
      iconBg: 'bg-gray-100 dark:bg-[#fafafa1a]',
      description: 'Content summaries and overviews'
    },
    quiz: {
      title: 'Quizzes',
      icon: HelpCircle,
      bgLight: 'bg-gray-50 dark:bg-[#1E1E1E]',
      borderColor: 'border-gray-200 dark:border-[#fafafa1a]',
      textColor: 'text-gray-700 dark:text-gray-300',
      iconBg: 'bg-gray-100 dark:bg-[#fafafa1a]',
      description: 'Interactive quiz questions and answers'
    },
    flashcards: {
      title: 'Flashcards',
      icon: Layers,
      bgLight: 'bg-gray-50 dark:bg-[#1E1E1E]',
      borderColor: 'border-gray-200 dark:border-[#fafafa1a]',
      textColor: 'text-gray-700 dark:text-gray-300',
      iconBg: 'bg-gray-100 dark:bg-[#fafafa1a]',
      description: 'Study cards for learning and memorization'
    },
    slides: {
      title: 'Presentations',
      icon: Presentation,
      bgLight: 'bg-gray-50 dark:bg-[#1E1E1E]',
      borderColor: 'border-gray-200 dark:border-[#fafafa1a]',
      textColor: 'text-gray-700 dark:text-gray-300',
      iconBg: 'bg-gray-100 dark:bg-[#fafafa1a]',
      description: 'Slide presentations and visual content'
    },
    other: {
      title: 'Other Content',
      icon: Folder,
      bgLight: 'bg-gray-50 dark:bg-[#1E1E1E]',
      borderColor: 'border-gray-200 dark:border-[#fafafa1a]',
      textColor: 'text-gray-700 dark:text-gray-300',
      iconBg: 'bg-gray-100 dark:bg-[#fafafa1a]',
      description: 'Miscellaneous content types'
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-[#fafafa] mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your content...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl p-6 text-center">
          <p className="text-gray-900 dark:text-[#fafafa]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-[#fafafa] mb-2 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-gray-700 dark:text-[#fafafacc]" />
              My Content
            </h1>
            <p className="text-gray-600 dark:text-[#fafafa99] text-lg">
              Manage and organize your generated educational content
            </p>
          </div>
          {contentList.length > 0 && (
            <button
              onClick={() => setShowPublishModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] px-6 py-3 rounded-xl font-semibold hover:bg-[#1a1a1a] dark:hover:bg-[#fafafacc] transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Rocket className="w-5 h-5" />
              Publish to Marketplace
            </button>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white dark:bg-[#171717] rounded-xl p-5 border border-gray-200 dark:border-[#fafafa1a] shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-[#fafafa99]">Total</p>
              <TrendingUp className="w-4 h-4 text-gray-400 dark:text-[#fafafa66]" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-[#fafafa]">{contentList.length}</p>
          </div>
          {Object.entries(groupedContent).map(([type, items]) => {
            const config = contentTypeConfig[type] || contentTypeConfig.other;
            const Icon = config.icon;
            return (
              <div 
                key={type} 
                className="bg-white dark:bg-[#171717] rounded-xl p-5 border border-gray-200 dark:border-[#fafafa1a] shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
                onClick={() => setActiveTab(type)}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{config.title}</p>
                  <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{items.length}</p>
              </div>
            );
          })}
        </div>

        {/* Search and View Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-[#fafafa66]" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl text-gray-900 dark:text-[#fafafa] placeholder-gray-400 dark:placeholder-[#fafafa66] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#fafafa2a] focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-gray-100 dark:bg-[#fafafa1a] text-gray-900 dark:text-[#fafafa]'
                  : 'text-gray-400 dark:text-[#fafafa66] hover:text-gray-600 dark:hover:text-[#fafafa99]'
              }`}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-100 dark:bg-[#fafafa1a] text-gray-900 dark:text-[#fafafa]'
                  : 'text-gray-400 dark:text-[#fafafa66] hover:text-gray-600 dark:hover:text-[#fafafa99]'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-[#fafafa1a] pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] shadow-md'
                : 'bg-white dark:bg-[#171717] text-gray-600 dark:text-[#fafafa99] hover:bg-gray-50 dark:hover:bg-[#1E1E1E] hover:text-gray-900 dark:hover:text-[#fafafa]'
            }`}
          >
            <Folder className="w-4 h-4" />
            All ({contentList.length})
          </button>
          {Object.entries(groupedContent).map(([type, items]) => {
            const config = contentTypeConfig[type] || contentTypeConfig.other;
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === type
                    ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] shadow-md'
                    : 'bg-white dark:bg-[#171717] text-gray-600 dark:text-[#fafafa99] hover:bg-gray-50 dark:hover:bg-[#1E1E1E] hover:text-gray-900 dark:hover:text-[#fafafa]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.title} ({items.length})
              </button>
            );
          })}
        </div>

        {/* Quiz Filter */}
        {activeTab === 'quiz' && (
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setQuizFilter('unsolved')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                quizFilter === 'unsolved'
                  ? 'bg-gray-100 dark:bg-[#fafafa1a] text-gray-900 dark:text-white border-2 border-gray-300 dark:border-[#fafafa2a]'
                  : 'bg-white dark:bg-[#171717] text-gray-600 dark:text-[#fafafa99] border border-gray-200 dark:border-[#fafafa1a] hover:bg-gray-50 dark:hover:bg-[#1E1E1E]'
              }`}
            >
              <Clock className="w-4 h-4" />
              Unsolved ({contentList.filter(item => item.type === 'quiz' && !isQuizSolved(item._id)).length})
            </button>
            <button
              onClick={() => setQuizFilter('solved')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                quizFilter === 'solved'
                  ? 'bg-gray-100 dark:bg-[#fafafa1a] text-gray-900 dark:text-white border-2 border-gray-300 dark:border-[#fafafa2a]'
                  : 'bg-white dark:bg-[#171717] text-gray-600 dark:text-[#fafafa99] border border-gray-200 dark:border-[#fafafa1a] hover:bg-gray-50 dark:hover:bg-[#1E1E1E]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Solved ({contentList.filter(item => item.type === 'quiz' && isQuizSolved(item._id)).length})
            </button>
          </div>
        )}
      </div>

      {/* Content Display */}
      {filteredContent.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#171717] rounded-xl border border-gray-200 dark:border-[#fafafa1a]">
          <Folder className="w-16 h-16 text-gray-400 dark:text-[#fafafa66] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-[#fafafa] mb-2">
            {searchQuery ? 'No results found' : 'No content found'}
          </h3>
          <p className="text-gray-600 dark:text-[#fafafa99]">
            {searchQuery ? 'Try adjusting your search query' : 'Start creating content to see it here'}
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
        }>
          {filteredContent.map(item => {
            const config = contentTypeConfig[item.type] || contentTypeConfig.other;
            const Icon = config.icon;
            const quizAttempt = item.type === 'quiz' ? getQuizAttempt(item._id) : null;
            const isSolved = item.type === 'quiz' && isQuizSolved(item._id);

            if (viewMode === 'grid') {
              return (
                <div 
                  key={item._id} 
                  className="group bg-white dark:bg-[#171717] rounded-xl border border-gray-200 dark:border-[#fafafa1a] p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300 dark:hover:border-[#fafafa2a]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${config.iconBg} border border-gray-200 dark:border-[#fafafa1a]`}>
                      <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    {isSolved && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold border border-gray-200 dark:border-[#fafafa1a]">
                        <CheckCircle2 className="w-4 h-4" />
                        {quizAttempt?.score}%
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleViewContent(item._id)}
                    className="block mb-3 w-full text-left group-hover:text-gray-700 dark:group-hover:text-[#fafafacc] transition-colors"
                  >
                    <h3 className="text-lg font-bold text-gray-900 dark:text-[#fafafa] line-clamp-2 mb-2">
                      {item.title}
                    </h3>
                  </button>

                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-[#fafafa99] mb-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(item.createdAt)}
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-[#fafafacc] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Source
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-[#fafafa1a]">
                    <button
                      onClick={() => handleViewContent(item._id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc] px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#fafafa2a] transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownload(item)}
                      disabled={downloadingItems.has(item._id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc] px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#fafafa2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {downloadingItems.has(item._id) ? '...' : 'Download'}
                    </button>
                    <button
                      onClick={() => handlePublishToMarketplace(item)}
                      className="p-2 bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc] rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa2a] transition-colors"
                      title="Publish to Marketplace"
                    >
                      <Rocket className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            } else {
              return (
                <div 
                  key={item._id} 
                  className="group bg-white dark:bg-[#171717] rounded-xl border border-gray-200 dark:border-[#fafafa1a] p-6 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${config.iconBg} border border-gray-200 dark:border-[#fafafa1a] flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <button
                          onClick={() => handleViewContent(item._id)}
                          className="flex-1 text-left group-hover:text-gray-700 dark:group-hover:text-[#fafafacc] transition-colors"
                        >
                          <h3 className="text-lg font-bold text-gray-900 dark:text-[#fafafa] mb-1">
                            {item.title}
                          </h3>
                        </button>
                        {isSolved && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold flex-shrink-0 border border-gray-200 dark:border-[#fafafa1a]">
                            <CheckCircle2 className="w-4 h-4" />
                            {quizAttempt?.score}%
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-[#fafafa99] mb-3">
                        <span className="capitalize font-medium">{config.title}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {formatDate(item.createdAt)}
                        </div>
                        {item.url && (
                          <>
                            <span>•</span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-[#fafafacc] transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Source
                            </a>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewContent(item._id)}
                          className="inline-flex items-center gap-2 bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc] px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#fafafa2a] transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => handleDownload(item)}
                          disabled={downloadingItems.has(item._id)}
                          className="inline-flex items-center gap-2 bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc] px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#fafafa2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          {downloadingItems.has(item._id) ? 'Downloading...' : 'Download'}
                        </button>
                        <button
                          onClick={() => handlePublishToMarketplace(item)}
                          className="inline-flex items-center gap-2 bg-gray-100 dark:bg-[#fafafa1a] text-gray-700 dark:text-[#fafafacc] px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#fafafa2a] transition-colors"
                        >
                          <Rocket className="w-4 h-4" />
                          Publish
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          })}
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

      {/* Content Sidebar */}
      <ContentSidebar
        contentId={sidebarContentId}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
      />
    </div>
  );
};

export default MyContent;
