import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';

function ForumCategory() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchCategory();
    fetchTopics();
  }, [id, currentPage, searchQuery]);

  const fetchCategory = async () => {
    try {
      const response = await api.get('/api/forum/categories');
      const foundCategory = response.data.categories.find(cat => cat._id === id);
      setCategory(foundCategory);
    } catch (error) {
      console.error('Error fetching category:', error);
    }
  };

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const params = {
        categoryId: id,
        page: currentPage,
        limit: 20
      };
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const response = await api.get('/api/forum/topics', { params });
      setTopics(response.data.topics || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Error fetching topics:', error);
      setError('Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTopics();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading topics...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-4">
            Category Not Found
          </h1>
          <button
            onClick={() => navigate('/forum')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Forum
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-[#171717cc] dark:text-[#fafafacc]">
            <li>
              <Link to="/forum" className="hover:text-blue-600 transition-colors">
                Forum
              </Link>
            </li>
            <li className="text-[#171717cc] dark:text-[#fafafacc]">/</li>
            <li className="text-[#171717cc] dark:text-[#fafafacc] font-medium">
              {category.name}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-2">
                {category.name}
              </h1>
              <p className="text-[#171717cc] dark:text-[#fafafacc]">
                {category.description}
              </p>
            </div>
            <div className="text-6xl opacity-60">
              {category.name === 'General Discussion' && '💬'}
              {category.name === 'Questions & Help' && '❓'}
              {category.name === 'Study Groups' && '👥'}
              {category.name === 'Announcements' && '📢'}
            </div>
          </div>
        </div>

        {/* Search and Create */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-[#2E2E2E] rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-r-lg transition-colors"
              >
                Search
              </button>
            </div>
          </form>
          
          {user && (
            <Link
              to={`/forum/create?category=${id}`}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              New Topic
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Topics List */}
        <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg overflow-hidden">
          {topics.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-2">
                No topics yet
              </h3>
              <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">
                {searchQuery ? 'No topics match your search.' : 'Be the first to start a discussion in this category!'}
              </p>
              {user && !searchQuery && (
                <Link
                  to={`/forum/create?category=${id}`}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Discussion
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-[#2E2E2E]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase tracking-wider">
                        Topic
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase tracking-wider">
                        Replies
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase tracking-wider">
                        Views
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] uppercase tracking-wider">
                        Last Post
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-[#2E2E2E]">
                    {topics.map((topic) => (
                      <tr key={topic._id} className="hover:bg-gray-50 dark:hover:bg-[#2E2E2E]">
                        <td className="px-6 py-4">
                          <Link
                            to={`/forum/topic/${topic._id}`}
                            className="block"
                          >
                            <div className="flex items-center">
                              {topic.isPinned && (
                                <span className="text-yellow-500 mr-2">📌</span>
                              )}
                              <div>
                                <div className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] hover:text-blue-600 transition-colors">
                                  {topic.title}
                                </div>
                                <div className="text-xs text-[#171717cc] dark:text-[#fafafacc] mt-1 line-clamp-2">
                                  {topic.content.substring(0, 100)}...
                                </div>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#171717cc] dark:text-[#fafafacc]">
                          {topic.authorName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#171717cc] dark:text-[#fafafacc]">
                          {topic.replyCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#171717cc] dark:text-[#fafafacc]">
                          {topic.viewCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#171717cc] dark:text-[#fafafacc]">
                          {topic.lastPostAt ? formatDate(topic.lastPostAt) : formatDate(topic.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-[#2E2E2E]">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                      Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, pagination.total)} of {pagination.total} topics
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 dark:border-[#2E2E2E] rounded text-sm text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                        Page {currentPage} of {pagination.pages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                        disabled={currentPage === pagination.pages}
                        className="px-3 py-1 border border-gray-300 dark:border-[#2E2E2E] rounded text-sm text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForumCategory;
