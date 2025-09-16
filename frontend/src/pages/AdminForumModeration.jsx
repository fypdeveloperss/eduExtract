import { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';

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
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading moderation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-2">
              Forum Moderation
            </h1>
            <p className="text-[#171717cc] dark:text-[#fafafacc]">
              Manage forum posts and topics, moderate inappropriate content
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200 dark:border-[#2E2E2E]">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'posts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-[#171717cc] dark:text-[#fafafacc] hover:text-gray-500'
                }`}
              >
                Posts ({pagination.total || 0})
              </button>
              <button
                onClick={() => setActiveTab('topics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'topics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-[#171717cc] dark:text-[#fafafacc] hover:text-gray-500'
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
                />
              </div>
              
              <div className="min-w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Search
              </button>
              
              <button
                type="button"
                onClick={clearFilters}
                className="text-[#171717cc] dark:text-[#fafafacc] hover:text-gray-500 px-4 py-2"
              >
                Clear
              </button>
            </form>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'posts' ? (
              <div>
                <h2 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4">
                  Forum Posts ({posts.length})
                </h2>
                
                {posts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-2">
                      No posts found
                    </h3>
                    <p className="text-[#171717cc] dark:text-[#fafafacc]">
                      {searchQuery || selectedCategory ? 'Try adjusting your filters' : 'No posts to moderate yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div key={post._id} className="bg-gray-50 dark:bg-[#2E2E2E] rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="font-medium text-[#171717cc] dark:text-[#fafafacc]">
                                {post.authorName}
                              </span>
                              <span className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                                {formatDate(post.createdAt)}
                              </span>
                              {post.isEdited && (
                                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                                  Edited
                                </span>
                              )}
                            </div>
                            
                            <div className="mb-2">
                              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-1">
                                <strong>Topic:</strong> {post.topicId?.title}
                              </p>
                              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                                <strong>Category:</strong> {post.topicId?.categoryId?.name}
                              </p>
                            </div>
                            
                            <div className="bg-white dark:bg-[#171717] rounded p-3 mb-3">
                              <p className="text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap">
                                {post.content}
                              </p>
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            <button
                              onClick={() => handleDeletePost(post._id)}
                              disabled={actionLoading[post._id]}
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center"
                            >
                              {actionLoading[post._id] === 'deleting' ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <span className="mr-1">🗑️</span>
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
                <h2 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4">
                  Forum Topics ({topics.length})
                </h2>
                
                {topics.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📝</div>
                    <h3 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-2">
                      No topics found
                    </h3>
                    <p className="text-[#171717cc] dark:text-[#fafafacc]">
                      {searchQuery || selectedCategory ? 'Try adjusting your filters' : 'No topics to moderate yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topics.map((topic) => (
                      <div key={topic._id} className="bg-gray-50 dark:bg-[#2E2E2E] rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc]">
                                {topic.title}
                              </h3>
                              <span className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                                by {topic.authorName}
                              </span>
                              <span className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                                {formatDate(topic.createdAt)}
                              </span>
                            </div>
                            
                            <div className="mb-2">
                              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-1">
                                <strong>Category:</strong> {topic.categoryId?.name}
                              </p>
                              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                                <strong>Replies:</strong> {topic.replyCount} | <strong>Views:</strong> {topic.viewCount}
                              </p>
                            </div>
                            
                            <div className="bg-white dark:bg-[#171717] rounded p-3 mb-3">
                              <p className="text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap">
                                {topic.content}
                              </p>
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            <button
                              onClick={() => handleDeleteTopic(topic._id)}
                              disabled={actionLoading[topic._id]}
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center"
                            >
                              {actionLoading[topic._id] === 'deleting' ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <span className="mr-1">🗑️</span>
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
              <div className="flex items-center justify-center mt-8">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 border rounded-lg ${
                        currentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 dark:border-[#2E2E2E] text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                    disabled={currentPage === pagination.pages}
                    className="px-3 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminForumModeration;
