import { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import PageLoader from '../components/PageLoader';
import LoaderSpinner from '../components/LoaderSpinner';
import { Search, X, Trash2, MessageSquare, FileText, Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react';

function AdminForumModeration() {
  const { user, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [topics, setTopics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchCategories();
      fetchData();
    }
  }, [isAdmin, activeTab, searchQuery, selectedCategory, currentPage]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/forum/admin/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: currentPage,
        limit: 20,
        search: searchQuery,
        categoryId: selectedCategory
      };
      
      if (activeTab === 'posts') {
        const response = await api.get('/api/forum/admin/posts', { params });
        setPosts(response.data.posts || []);
        setPagination(response.data.pagination || {});
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        const response = await api.get('/api/forum/admin/topics', { params });
        setTopics(response.data.topics || []);
        setPagination(response.data.pagination || {});
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData();
  };

  const handleDeletePost = async (postId, reason = '') => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [postId]: 'deleting' }));
      setError('');
      setSuccess('');
      
      await api.delete(`/api/forum/admin/posts/${postId}`, {
        data: { reason }
      });
      
      setPosts(prev => prev.filter(post => post._id !== postId));
      setSuccess('Post deleted successfully');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to delete post:', error);
      setError('Failed to delete post');
    } finally {
      setActionLoading(prev => ({ ...prev, [postId]: null }));
    }
  };

  const handleDeleteTopic = async (topicId, reason = '') => {
    if (!window.confirm('Are you sure you want to delete this topic and all its posts? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [topicId]: 'deleting' }));
      setError('');
      setSuccess('');
      
      await api.delete(`/api/forum/admin/topics/${topicId}`, {
        data: { reason }
      });
      
      setTopics(prev => prev.filter(topic => topic._id !== topicId));
      setSuccess('Topic deleted successfully');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to delete topic:', error);
      setError('Failed to delete topic');
    } finally {
      setActionLoading(prev => ({ ...prev, [topicId]: null }));
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && posts.length === 0 && topics.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-2">
          Forum Moderation
        </h1>
        <p className="text-[#171717cc] dark:text-[#fafafacc]">
          Manage forum posts and topics, moderate inappropriate content
        </p>
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

      {/* Main Card */}
      <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-[#2E2E2E]">
          <nav className="flex gap-6 px-6">
            <button
              onClick={() => {
                setActiveTab('posts');
                setCurrentPage(1);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'posts'
                  ? 'border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa]'
                  : 'border-transparent text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]'
              }`}
            >
              <span className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Posts ({pagination.total || 0})
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('topics');
                setCurrentPage(1);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'topics'
                  ? 'border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa]'
                  : 'border-transparent text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]'
              }`}
            >
              <span className="flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Topics ({pagination.total || 0})
              </span>
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f]">
          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts and topics..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
              />
            </div>
            
            <div className="min-w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              Search
            </button>
            
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center px-4 py-2.5 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors font-medium"
            >
              <X className="w-4 h-4 mr-1.5" />
              Clear
            </button>
          </form>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'posts' ? (
            <div>
              <h2 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
                Forum Posts ({posts.length})
              </h2>
              
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-[#171717cc] dark:text-[#fafafacc]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
                    No posts found
                  </h3>
                  <p className="text-[#171717cc] dark:text-[#fafafacc]">
                    {searchQuery || selectedCategory ? 'Try adjusting your filters' : 'No posts to moderate yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post._id} className="border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] rounded-lg p-5 hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                              <span className="font-medium text-[#171717] dark:text-[#fafafa]">
                                {post.authorName}
                              </span>
                            </div>
                            <span className="flex items-center text-xs text-[#171717cc] dark:text-[#fafafacc]">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(post.createdAt)}
                            </span>
                            {post.isEdited && (
                              <span className="px-2 py-1 rounded-lg border border-gray-200 dark:border-[#2E2E2E] text-xs text-[#171717cc] dark:text-[#fafafacc] bg-gray-50 dark:bg-[#1f1f1f]">
                                Edited
                              </span>
                            )}
                          </div>
                          
                          <div className="mb-3 space-y-1 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                            <p>
                              <span className="font-medium text-[#171717] dark:text-[#fafafa]">Topic:</span> {post.topicId?.title || 'N/A'}
                            </p>
                            <p>
                              <span className="font-medium text-[#171717] dark:text-[#fafafa]">Category:</span> {post.topicId?.categoryId?.name || 'N/A'}
                            </p>
                          </div>
                          
                          <div className="border border-gray-200 dark:border-[#2E2E2E] rounded-lg p-4 bg-gray-50 dark:bg-[#1f1f1f]">
                            <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap">
                              {post.content}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <button
                            onClick={() => handleDeletePost(post._id)}
                            disabled={actionLoading[post._id]}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            {actionLoading[post._id] === 'deleting' ? (
                              <>
                                <LoaderSpinner size="sm" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Delete
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
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
                Forum Topics ({topics.length})
              </h2>
              
              {topics.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-[#171717cc] dark:text-[#fafafacc]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
                    No topics found
                  </h3>
                  <p className="text-[#171717cc] dark:text-[#fafafacc]">
                    {searchQuery || selectedCategory ? 'Try adjusting your filters' : 'No topics to moderate yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topics.map((topic) => (
                    <div key={topic._id} className="border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] rounded-lg p-5 hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
                              {topic.title}
                            </h3>
                            <span className="text-xs text-[#171717cc] dark:text-[#fafafacc]">
                              by {topic.authorName}
                            </span>
                            <span className="flex items-center text-xs text-[#171717cc] dark:text-[#fafafacc]">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(topic.createdAt)}
                            </span>
                          </div>
                           
                          <div className="mb-3 space-y-1 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                            <p>
                              <span className="font-medium text-[#171717] dark:text-[#fafafa]">Category:</span> {topic.categoryId?.name || 'N/A'}
                            </p>
                            <p>
                              <span className="font-medium text-[#171717] dark:text-[#fafafa]">Replies:</span> {topic.replyCount || 0} • <span className="font-medium text-[#171717] dark:text-[#fafafa]">Views:</span> {topic.viewCount || 0}
                            </p>
                          </div>
                           
                          <div className="border border-gray-200 dark:border-[#2E2E2E] rounded-lg p-4 bg-gray-50 dark:bg-[#1f1f1f]">
                            <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap">
                              {topic.content}
                            </p>
                          </div>
                        </div>
                          
                        <div className="flex items-start">
                          <button
                            onClick={() => handleDeleteTopic(topic._id)}
                            disabled={actionLoading[topic._id]}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            {actionLoading[topic._id] === 'deleting' ? (
                              <>
                                <LoaderSpinner size="sm" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Delete
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
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#2E2E2E]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} {activeTab === 'posts' ? 'posts' : 'topics'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center px-3 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#2E2E2E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                    disabled={currentPage >= pagination.pages}
                    className="flex items-center px-3 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#2E2E2E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminForumModeration;
