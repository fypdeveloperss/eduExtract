import { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import PageLoader from '../components/PageLoader';
import LoaderSpinner from '../components/LoaderSpinner';

function AdminForumModeration() {
  const { user, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' or 'topics'
  const [posts, setPosts] = useState([]);
  const [topics, setTopics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  // Redirect if not admin
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
      } else {
        const response = await api.get('/api/forum/admin/topics', { params });
        setTopics(response.data.topics || []);
        setPagination(response.data.pagination || {});
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
      
      await api.delete(`/api/forum/admin/posts/${postId}`, {
        data: { reason }
      });
      
      // Remove from posts list
      setPosts(prev => prev.filter(post => post._id !== postId));
      
      console.log('Post deleted successfully');
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
      
      await api.delete(`/api/forum/admin/topics/${topicId}`, {
        data: { reason }
      });
      
      // Remove from topics list
      setTopics(prev => prev.filter(topic => topic._id !== topicId));
      
      console.log('Topic deleted successfully');
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
    <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-2">
              Forum Moderation
            </h1>
            <p className="text-sm md:text-base text-[#171717cc] dark:text-[#fafafacc]">
              Manage forum posts and topics, moderate inappropriate content
            </p>
          </div>
        </div>

        {error && (
          <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl shadow-lg">
          <div className="border-b border-gray-200 dark:border-[#2E2E2E]">
            <nav className="flex gap-6 px-6">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'posts'
                    ? 'border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa]'
                    : 'border-transparent text-[#17171799] dark:text-[#fafafa99] hover:text-[#171717] dark:hover:text-[#fafafa]'
                }`}
              >
                Posts ({pagination.total || 0})
              </button>
              <button
                onClick={() => setActiveTab('topics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'topics'
                    ? 'border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa]'
                    : 'border-transparent text-[#17171799] dark:text-[#fafafa99] hover:text-[#171717] dark:hover:text-[#fafafa]'
                }`}
              >
                Topics ({pagination.total || 0})
              </button>
            </nav>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200 dark:border-[#2E2E2E]">
            <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search posts and topics..."
                  className="w-full px-4 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafa66]"
                />
              </div>
              
              <div className="min-w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa]"
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
                className="inline-flex items-center justify-center px-6 py-2 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
              >
                Search
              </button>
              
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] transition-colors"
              >
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
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">💬</div>
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
                      <div key={post._id} className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <span className="font-medium text-[#171717] dark:text-[#fafafa]">
                                {post.authorName}
                              </span>
                              <span className="text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                                {formatDate(post.createdAt)}
                              </span>
                              {post.isEdited && (
                                <span className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-[#2E2E2E] text-[#17171799] dark:text-[#fafafa99]">Edited</span>
                              )}
                            </div>
                            
                            <div className="mb-3 space-y-1 text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                              <p>
                                <span className="font-medium text-[#171717] dark:text-[#fafafa]">Topic:</span> {post.topicId?.title}
                              </p>
                              <p>
                                <span className="font-medium text-[#171717] dark:text-[#fafafa]">Category:</span> {post.topicId?.categoryId?.name}
                              </p>
                            </div>
                            
                            <div className="border border-gray-200 dark:border-[#2E2E2E] rounded-lg p-3 bg-white dark:bg-[#171717]">
                              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap">
                                {post.content}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start justify-end">
                            <button
                              onClick={() => handleDeletePost(post._id)}
                              disabled={actionLoading[post._id]}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2E2E2E] text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading[post._id] === 'deleting' ? (
                                <>
                                  <LoaderSpinner size="sm" />
                                  Deleting...
                                </>
                              ) : (
                                <>
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
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📝</div>
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
                      <div key={topic._id} className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
                                {topic.title}
                              </h3>
                              <span className="text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                                by {topic.authorName}
                              </span>
                              <span className="text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                                {formatDate(topic.createdAt)}
                              </span>
                            </div>
                             
                            <div className="mb-3 space-y-1 text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                              <p>
                                <span className="font-medium text-[#171717] dark:text-[#fafafa]">Category:</span> {topic.categoryId?.name}
                              </p>
                              <p>
                                <span className="font-medium text-[#171717] dark:text-[#fafafa]">Replies:</span> {topic.replyCount} • <span className="font-medium text-[#171717] dark:text-[#fafafa]">Views:</span> {topic.viewCount}
                              </p>
                            </div>
                             
                            <div className="border border-gray-200 dark:border-[#2E2E2E] rounded-lg p-3 bg-white dark:bg-[#171717]">
                              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap">
                                {topic.content}
                              </p>
                            </div>
                          </div>
                            
                          <div className="flex items-start justify-end">
                            <button
                              onClick={() => handleDeleteTopic(topic._id)}
                              disabled={actionLoading[topic._id]}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2E2E2E] text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading[topic._id] === 'deleting' ? (
                                <>
                                  <LoaderSpinner size="sm" />
                                  Deleting...
                                </>
                              ) : (
                                <>
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
              <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} {activeTab === 'posts' ? 'posts' : 'topics'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-xs md:text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-xs md:text-sm text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminForumModeration;
