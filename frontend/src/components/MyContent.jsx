import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNotification } from '../context/NotificationContext';
import PageLoader from './PageLoader';
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
  Sparkles,
  Tag,
  X,
  Plus,
  Edit2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../utils/axios';
import MarketplaceContentSelectionModal from './MarketplaceContentSelectionModal';
import { authenticatedFetch } from '../utils/auth';
import ContentSidebar from './ContentSidebar';

const MyContent = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();
  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
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
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Advanced filtering states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Debounced filter states (for API calls)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [debouncedFilterSubject, setDebouncedFilterSubject] = useState('');
  
  // Tag editing states
  const [editingContentId, setEditingContentId] = useState(null);
  const [editingTags, setEditingTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  
  // Refs for debouncing
  const searchDebounceRef = useRef(null);
  const subjectDebounceRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  // Debounce subject filter
  useEffect(() => {
    if (subjectDebounceRef.current) {
      clearTimeout(subjectDebounceRef.current);
    }
    subjectDebounceRef.current = setTimeout(() => {
      setDebouncedFilterSubject(filterSubject);
    }, 300);
    
    return () => {
      if (subjectDebounceRef.current) {
        clearTimeout(subjectDebounceRef.current);
      }
    };
  }, [filterSubject]);

  // Fetch content with debounced values
  useEffect(() => {
    const fetchContent = async () => {
      if (!user) {
        setError('Please sign in to view your content.');
        setLoading(false);
        setInitialLoad(false);
        return;
      }
      try {
        // Only show full page loader on initial load
        if (initialLoad) {
        setLoading(true);
        } else {
          // For subsequent filter changes, use subtle loading indicator
          setFilterLoading(true);
        }
        setError(null);
        
        // Build query params using debounced values
        const params = new URLSearchParams();
        if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
        if (activeTab !== 'all') params.append('type', activeTab);
        if (filterCategory) params.append('category', filterCategory);
        if (debouncedFilterSubject) params.append('subject', debouncedFilterSubject);
        if (filterDifficulty) params.append('difficulty', filterDifficulty);
        if (selectedTags.length > 0) {
          selectedTags.forEach(tag => params.append('tags', tag));
        }
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
        
        const res = await api.get(`/api/content?${params.toString()}`);
        setContentList(res.data);
        setInitialLoad(false);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch content.');
        setInitialLoad(false);
      } finally {
        setLoading(false);
        setFilterLoading(false);
      }
    };
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, debouncedSearchQuery, activeTab, filterCategory, debouncedFilterSubject, filterDifficulty, selectedTags, dateFrom, dateTo]);

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      if (!user) return;
      try {
        const res = await api.get('/api/content/tags/all');
        setAvailableTags(res.data);
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      }
    };
    fetchTags();
  }, [user, contentList]);

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
          showWarning(`Published ${successful} out of ${total} items. ${failed} items failed to publish.`, {
            title: 'Partial Success',
            duration: 8000
          });
        } else {
          let message = `Successfully published ${successful} items to the marketplace!`;
          if (approvedCount > 0) {
            message += `\n✅ ${approvedCount} items are now live and visible.`;
          }
          if (pendingCount > 0) {
            message += `\n⏳ ${pendingCount} items are pending admin approval.`;
          }
          showSuccess(message, {
            title: 'Publishing Complete',
            duration: 8000
          });
        }
      }
    } catch (error) {
      console.error('Error publishing content:', error);
      showError(`Error: ${error.message}`, {
        title: 'Publishing Failed'
      });
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
          showWarning(`Download not supported for content type: ${content.type}`, {
            title: 'Download Not Available'
          });
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
      showError(`Failed to download ${content.type}: ${error.message || 'Please try again.'}`, {
        title: 'Download Failed'
      });
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(contentId);
        return newSet;
      });
    }
  };

  const groupedContent = useMemo(() => {
    return contentList.reduce((acc, item) => {
      const type = item.type || 'other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    }, {});
  }, [contentList]);

  const filteredContent = useMemo(() => {
    // Server-side filtering is now handled, but we still need client-side quiz filtering
    let filtered = contentList;
    
    if (activeTab === 'quiz') {
      if (quizFilter === 'solved') {
        filtered = filtered.filter(item => {
          return quizAttempts.some(attempt => {
            const attemptQuizId = attempt.quizId._id ? attempt.quizId._id.toString() : attempt.quizId.toString();
            return attemptQuizId === item._id.toString();
          });
        });
      } else if (quizFilter === 'unsolved') {
        filtered = filtered.filter(item => {
          return !quizAttempts.some(attempt => {
            const attemptQuizId = attempt.quizId._id ? attempt.quizId._id.toString() : attempt.quizId.toString();
            return attemptQuizId === item._id.toString();
          });
        });
      }
    }
    
    return filtered;
  }, [contentList, activeTab, quizFilter, quizAttempts]);

  const handleUpdateMetadata = useCallback(async (contentId, metadata) => {
    try {
      const res = await api.put(`/api/content/${contentId}/metadata`, metadata);
      // Update local state
      setContentList(prev => prev.map(item => 
        item._id === contentId ? { ...item, ...res.data } : item
      ));
      showSuccess('Content metadata updated successfully');
      setEditingContentId(null);
      setEditingTags([]);
      setNewTagInput('');
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to update metadata');
    }
  }, [showSuccess, showError]);

  const handleAddTag = (contentId, currentTags = []) => {
    setEditingContentId(contentId);
    setEditingTags([...currentTags]);
    setNewTagInput('');
  };

  const handleSaveTags = async (contentId) => {
    await handleUpdateMetadata(contentId, { tags: editingTags });
  };

  const handleAddTagToEditing = () => {
    const tag = newTagInput.trim();
    if (tag && !editingTags.includes(tag)) {
      setEditingTags([...editingTags, tag]);
      setNewTagInput('');
    }
  };

  const handleRemoveTagFromEditing = (tagToRemove) => {
    setEditingTags(editingTags.filter(tag => tag !== tagToRemove));
  };

  const clearFilters = () => {
    setFilterCategory('');
    setFilterSubject('');
    setFilterDifficulty('');
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
  };

  const isQuizSolved = useCallback((quizId) => {
    return quizAttempts.some(attempt => {
      const attemptQuizId = attempt.quizId._id ? attempt.quizId._id.toString() : attempt.quizId.toString();
      return attemptQuizId === quizId.toString();
    });
  }, [quizAttempts]);

  const getQuizAttempt = useCallback((quizId) => {
    return quizAttempts.find(attempt => {
      const attemptQuizId = attempt.quizId._id ? attempt.quizId._id.toString() : attempt.quizId.toString();
      return attemptQuizId === quizId.toString();
    });
  }, [quizAttempts]);


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
    
    // Reset time to midnight for accurate day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateToCheck = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    
    // Calculate difference in days
    const diffTime = today - dateToCheck;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-4 space-y-8">
        <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-lg p-6 text-center">
          <p className="text-sm text-[#171717] dark:text-[#fafafa]">{error}</p>
        </div>
      </div></div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-4 space-y-8">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-3 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" />
              My Content
            </h1>
            <p className="text-[#171717cc] dark:text-[#fafafacc] text-base md:text-lg">
              Manage and organize your generated educational content
            </p>
          </div>
        {contentList.length > 0 && (
          <button
            onClick={() => setShowPublishModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm"
          >
              <Rocket className="w-4 h-4" />
            Publish to Marketplace
          </button>
        )}
      </div>
      
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-[#171717] rounded-xl p-4 border border-gray-200 dark:border-[#fafafa1a] shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Total</p>
              <TrendingUp className="w-4 h-4 text-[#171717cc] dark:text-[#fafafa66]" />
            </div>
            <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">{contentList.length}</p>
          </div>
          {Object.entries(groupedContent).map(([type, items]) => {
            const config = contentTypeConfig[type] || contentTypeConfig.other;
            const Icon = config.icon;
            return (
              <div 
                key={type} 
                className="bg-white dark:bg-[#171717] rounded-xl p-4 border border-gray-200 dark:border-[#fafafa1a] shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
                onClick={() => setActiveTab(type)}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#171717cc] dark:text-[#fafafacc]">{config.title}</p>
                  <Icon className="w-4 h-4 text-[#171717cc] dark:text-[#fafafa66] group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">{items.length}</p>
              </div>
            );
          })}
        </div>

        {/* Search and View Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#171717cc] dark:text-[#fafafa66]" />
            <input
              type="text"
              placeholder="Search content, tags, or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-lg text-[#171717] dark:text-[#fafafa] placeholder-[#171717cc] dark:placeholder-[#fafafa66] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#fafafa2a] focus:border-transparent transition-all text-sm"
            />
            {filterLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-gray-300 dark:border-[#fafafa66] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-lg text-sm font-semibold transition-colors ${
                showAdvancedFilters 
                  ? 'bg-gray-100 dark:bg-[#1E1E1E] text-[#171717] dark:text-[#fafafa]' 
                  : 'text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#1E1E1E]'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-lg p-1">
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
              </div>
              
        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl p-6 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Advanced Filters
              </h3>
              <button
                onClick={clearFilters}
                className="text-sm text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#fafafa2a]"
                >
                  <option value="">All Categories</option>
                  <option value="mathematics">Mathematics</option>
                  <option value="science">Science</option>
                  <option value="history">History</option>
                  <option value="literature">Literature</option>
                  <option value="languages">Languages</option>
                  <option value="arts">Arts</option>
                  <option value="technology">Technology</option>
                  <option value="business">Business</option>
                  <option value="health">Health</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Subject</label>
                <input
                  type="text"
                  placeholder="Filter by subject..."
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] placeholder-[#171717cc] dark:placeholder-[#fafafa66] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#fafafa2a]"
                />
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Difficulty</label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#fafafa2a]"
                >
                  <option value="">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Tags Filter */}
              <div>
                <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-[#1E1E1E] text-[#171717] dark:text-[#fafafa] rounded-lg text-xs font-medium border border-gray-200 dark:border-[#fafafa1a]"
                    >
                      {tag}
                      <button
                        onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !selectedTags.includes(e.target.value)) {
                      setSelectedTags([...selectedTags, e.target.value]);
                    }
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#fafafa2a]"
                >
                  <option value="">Select a tag...</option>
                  {availableTags.filter(tag => !selectedTags.includes(tag)).map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {/* Date Range Filters */}
              <div>
                <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#fafafa2a]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#fafafa2a]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 dark:border-[#fafafa1a] pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2 rounded-lg font-semibold transition-colors duration-200 text-sm flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717]'
                : 'text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-100 dark:hover:bg-[#1E1E1E]'
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
                className={`px-5 py-2 rounded-lg font-semibold transition-colors duration-200 text-sm flex items-center gap-2 ${
                  activeTab === type
                    ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717]'
                    : 'text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-100 dark:hover:bg-[#1E1E1E]'
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
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setQuizFilter('unsolved')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-sm flex items-center gap-2 ${
                quizFilter === 'unsolved'
                  ? 'bg-gray-100 dark:bg-[#fafafa1a] text-[#171717] dark:text-[#fafafa] border-2 border-gray-300 dark:border-[#fafafa2a]'
                  : 'bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] border border-gray-200 dark:border-[#fafafa1a] hover:bg-gray-50 dark:hover:bg-[#1E1E1E]'
              }`}
            >
              <Clock className="w-4 h-4" />
              Unsolved ({contentList.filter(item => item.type === 'quiz' && !isQuizSolved(item._id)).length})
            </button>
            <button
              onClick={() => setQuizFilter('solved')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-sm flex items-center gap-2 ${
                quizFilter === 'solved'
                  ? 'bg-gray-100 dark:bg-[#fafafa1a] text-[#171717] dark:text-[#fafafa] border-2 border-gray-300 dark:border-[#fafafa2a]'
                  : 'bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] border border-gray-200 dark:border-[#fafafa1a] hover:bg-gray-50 dark:hover:bg-[#1E1E1E]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Solved ({contentList.filter(item => item.type === 'quiz' && isQuizSolved(item._id)).length})
            </button>
          </div>
        )}
      </div>

      {/* Content Display */}
      {filterLoading && filteredContent.length === 0 && contentList.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#171717] rounded-xl border border-gray-200 dark:border-[#fafafa1a] shadow-lg p-8">
          <div className="w-8 h-8 border-2 border-gray-300 dark:border-[#fafafa66] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Loading...</p>
        </div>
      ) : filteredContent.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#171717] rounded-xl border border-gray-200 dark:border-[#fafafa1a] shadow-lg p-8">
          <Folder className="w-12 h-12 text-[#171717cc] dark:text-[#fafafa66] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
            {searchQuery || filterCategory || filterSubject || filterDifficulty || selectedTags.length > 0 ? 'No results found' : 'No content found'}
          </h3>
          <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
            {searchQuery || filterCategory || filterSubject || filterDifficulty || selectedTags.length > 0 ? 'Try adjusting your filters' : 'Start creating content to see it here'}
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
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
                  className="group bg-white dark:bg-[#171717] rounded-xl border border-gray-200 dark:border-[#fafafa1a] p-4 hover:shadow-lg transition-all duration-200 hover:border-gray-300 dark:hover:border-[#fafafa2a]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${config.iconBg} border border-gray-200 dark:border-[#fafafa1a]`}>
                      <Icon className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
                    </div>
                    {isSolved && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-[#fafafa1a] text-[#171717cc] dark:text-[#fafafacc] rounded-lg text-xs font-semibold border border-gray-200 dark:border-[#fafafa1a]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {quizAttempt?.score}%
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleViewContent(item._id)}
                    className="block mb-3 w-full text-left group-hover:text-[#171717cc] dark:group-hover:text-[#fafafacc] transition-colors"
                  >
                    <h3 className="text-base font-bold text-[#171717] dark:text-[#fafafa] line-clamp-2 mb-2">
                      {item.title}
                    </h3>
                  </button>

                  {/* Metadata Display */}
                  <div className="mb-3 space-y-2">
                    {(item.category || item.subject || item.difficulty) && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {item.category && (
                          <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800/50 capitalize">
                            {item.category}
                          </span>
                        )}
                        {item.subject && (
                          <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg border border-purple-200 dark:border-purple-800/50">
                            {item.subject}
                          </span>
                        )}
                        {item.difficulty && (
                          <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800/50 capitalize">
                            {item.difficulty}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Tags Display */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-[#1E1E1E] text-[#171717] dark:text-[#fafafa] rounded-lg text-xs font-medium border border-gray-200 dark:border-[#fafafa1a]"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                        {item.tags.length > 3 && (
                          <span className="px-2 py-0.5 text-xs text-[#171717cc] dark:text-[#fafafacc]">
                            +{item.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#171717cc] dark:text-[#fafafacc] mb-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(item.createdAt)}
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Source
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-[#fafafa1a]">
                    <button
                      onClick={() => handleViewContent(item._id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#fafafa1a] text-[#171717cc] dark:text-[#fafafacc] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-[#fafafa2a] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownload(item)}
                      disabled={downloadingItems.has(item._id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#fafafa1a] text-[#171717cc] dark:text-[#fafafacc] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-[#fafafa2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {downloadingItems.has(item._id) ? '...' : 'Download'}
                    </button>
                <button
                  onClick={() => handlePublishToMarketplace(item)}
                      className="p-1.5 bg-gray-100 dark:bg-[#fafafa1a] text-[#171717cc] dark:text-[#fafafacc] rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa2a] transition-colors"
                      title="Publish to Marketplace"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleAddTag(item._id, item.tags || [])}
                      className="p-1.5 bg-gray-100 dark:bg-[#fafafa1a] text-[#171717cc] dark:text-[#fafafacc] rounded-lg hover:bg-gray-200 dark:hover:bg-[#fafafa2a] transition-colors"
                      title="Edit Tags & Metadata"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
              );
            } else {
              return (
                <div 
                  key={item._id} 
                  className="group bg-white dark:bg-[#171717] rounded-xl border border-gray-200 dark:border-[#fafafa1a] p-4 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${config.iconBg} border border-gray-200 dark:border-[#fafafa1a] flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <button
                          onClick={() => handleViewContent(item._id)}
                          className="flex-1 text-left group-hover:text-[#171717cc] dark:group-hover:text-[#fafafacc] transition-colors"
                        >
                          <h3 className="text-base font-bold text-[#171717] dark:text-[#fafafa] mb-1">
                            {item.title}
                          </h3>
                        </button>
                        {isSolved && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-[#fafafa1a] text-[#171717cc] dark:text-[#fafafacc] rounded-lg text-xs font-semibold flex-shrink-0 border border-gray-200 dark:border-[#fafafa1a]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {quizAttempt?.score}%
                          </div>
                        )}
                      </div>

                      {/* Metadata Display */}
                      {(item.category || item.subject || item.difficulty || (item.tags && item.tags.length > 0)) && (
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {item.category && (
                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800/50 text-xs capitalize">
                              {item.category}
                            </span>
                          )}
                          {item.subject && (
                            <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg border border-purple-200 dark:border-purple-800/50 text-xs">
                              {item.subject}
                            </span>
                          )}
                          {item.difficulty && (
                            <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800/50 text-xs capitalize">
                              {item.difficulty}
                            </span>
                          )}
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-[#1E1E1E] text-[#171717] dark:text-[#fafafa] rounded-lg text-xs font-medium border border-gray-200 dark:border-[#fafafa1a]"
                                >
                                  <Tag className="w-3 h-3" />
                                  {tag}
                                </span>
                              ))}
                              {item.tags.length > 3 && (
                                <span className="px-2 py-0.5 text-xs text-[#171717cc] dark:text-[#fafafacc]">
                                  +{item.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-[#171717cc] dark:text-[#fafafacc] mb-3">
                        <span className="capitalize font-medium">{config.title}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(item.createdAt)}
                        </div>
                        {item.url && (
                          <>
                            <span>•</span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Source
                            </a>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewContent(item._id)}
                          className="inline-flex items-center gap-2 bg-gray-100 dark:bg-[#fafafa1a] text-[#171717cc] dark:text-[#fafafacc] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-[#fafafa2a] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => handleDownload(item)}
                          disabled={downloadingItems.has(item._id)}
                          className="inline-flex items-center gap-2 bg-gray-100 dark:bg-[#fafafa1a] text-[#171717cc] dark:text-[#fafafacc] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-[#fafafa2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {downloadingItems.has(item._id) ? 'Downloading...' : 'Download'}
                        </button>
                        <button
                          onClick={() => handlePublishToMarketplace(item)}
                          className="inline-flex items-center gap-2 bg-gray-100 dark:bg-[#fafafa1a] text-[#171717cc] dark:text-[#fafafacc] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-[#fafafa2a] transition-colors"
                        >
                          <Rocket className="w-3.5 h-3.5" />
                          Publish
                        </button>
                        <button
                          onClick={() => handleAddTag(item._id, item.tags || [])}
                          className="inline-flex items-center gap-2 bg-gray-100 dark:bg-[#fafafa1a] text-[#171717cc] dark:text-[#fafafacc] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-[#fafafa2a] transition-colors"
                          title="Edit Tags & Metadata"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
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

      {/* Edit Metadata Modal */}
      {editingContentId && (() => {
        const content = contentList.find(c => c._id === editingContentId);
        if (!content) return null;
        
        // Use a separate component for the modal to handle state properly
        return <EditMetadataModal 
          content={content}
          editingTags={editingTags}
          newTagInput={newTagInput}
          onClose={() => {
            setEditingContentId(null);
            setEditingTags([]);
            setNewTagInput('');
          }}
          onSave={(metadata) => {
            handleUpdateMetadata(editingContentId, metadata);
          }}
          onAddTag={handleAddTagToEditing}
          onRemoveTag={handleRemoveTagFromEditing}
          onTagInputChange={setNewTagInput}
        />;
      })()}
      </div>
    </div>
  );
};

// Separate component for the edit modal
const EditMetadataModal = ({ content, editingTags, newTagInput, onClose, onSave, onAddTag, onRemoveTag, onTagInputChange }) => {
  const [editCategory, setEditCategory] = useState(content.category || 'other');
  const [editSubject, setEditSubject] = useState(content.subject || '');
  const [editDifficulty, setEditDifficulty] = useState(content.difficulty || 'beginner');
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#171717] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-[#fafafa1a]">
        <div className="flex items-center justify-between p-6 border-b border-[#fafafa1a] bg-gray-50 dark:bg-[#121212]">
          <h2 className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">Edit Content Metadata</h2>
          <button
            onClick={onClose}
            className="text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#171717] border border-[#fafafa1a] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#fafafa2a]"
              >
                <option value="mathematics">Mathematics</option>
                <option value="science">Science</option>
                <option value="history">History</option>
                <option value="literature">Literature</option>
                <option value="languages">Languages</option>
                <option value="arts">Arts</option>
                <option value="technology">Technology</option>
                <option value="business">Business</option>
                <option value="health">Health</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Subject</label>
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="e.g., Algebra, Biology, World War II"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#171717] border border-[#fafafa1a] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] placeholder-[#17171766] dark:placeholder-[#fafafa66] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#fafafa2a]"
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Difficulty</label>
              <select
                value={editDifficulty}
                onChange={(e) => setEditDifficulty(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#171717] border border-[#fafafa1a] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#fafafa2a]"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-2">Tags</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editingTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-[#1E1E1E] text-[#171717] dark:text-[#fafafa] rounded-lg text-sm font-medium border border-gray-200 dark:border-[#fafafa1a]"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    {tag}
                    <button
                      onClick={() => onRemoveTag(tag)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => onTagInputChange(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddTag();
                    }
                  }}
                  placeholder="Add a tag..."
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-[#171717] border border-[#fafafa1a] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] placeholder-[#17171766] dark:placeholder-[#fafafa66] focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#fafafa2a]"
                />
                <button
                  onClick={onAddTag}
                  className="px-4 py-2.5 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-semibold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#fafafa1a] bg-gray-50 dark:bg-[#121212]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] font-semibold transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-[#1E1E1E]"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({
                tags: editingTags,
                category: editCategory,
                subject: editSubject,
                difficulty: editDifficulty
              });
            }}
            className="px-6 py-2.5 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-semibold"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyContent; 
