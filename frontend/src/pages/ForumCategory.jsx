import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import PageLoader from '../components/PageLoader';
import LoaderSpinner from '../components/LoaderSpinner';

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
    return <PageLoader />;
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-4">
            Category Not Found
          </h1>
          <button
            onClick={() => navigate('/forum')}
            className="px-6 py-3 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity"
          >
            Back to Forum
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        {/* Breadcrumb */}
        <nav>
          <ol className="flex items-center gap-2 text-xs md:text-sm text-[#171717cc] dark:text-[#fafafacc]">
            <li>
              <Link to="/forum" className="hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors">
                Forum
              </Link>
            </li>
            <li className="text-[#17171733] dark:text-[#fafafa22]">/</li>
            <li className="text-[#171717] dark:text-[#fafafa] font-medium">
              {category.name}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl shadow-lg px-6 py-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-3">
              {category.name}
            </h1>
            <p className="text-sm md:text-base text-[#171717cc] dark:text-[#fafafacc] max-w-2xl">
              {category.description}
            </p>
          </div>
          <div className="text-5xl md:text-6xl">
            {category.name === 'General Discussion' && '💬'}
            {category.name === 'Questions & Help' && '❓'}
            {category.name === 'Study Groups' && '👥'}
            {category.name === 'Announcements' && '📢'}
            {!['General Discussion','Questions & Help','Study Groups','Announcements'].includes(category.name) && '📚'}
          </div>
        </div>

        {/* Search and Create */}
        <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl shadow-sm p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="flex rounded-lg border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search topics..."
                  className="flex-1 px-4 py-2 bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafa66] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
                >
                  Search
                </button>
              </div>
            </form>

            {user && (
               <Link
                 to={`/forum/create?category=${id}`}
                 className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
               >
                 New Topic
               </Link>
             )}
          </div>
        </div>

        {error && (
          <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
            {error}
          </div>
        )}

        {/* Topics List */}
        <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl shadow-lg">
          <div className="bg-gray-50 dark:bg-[#1E1E1E] px-6 py-5 border-b border-gray-200 dark:border-[#2E2E2E] flex items-center justify-between rounded-t-2xl">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[#17171766] dark:text-[#fafafa55]">Category Threads</p>
              <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mt-1">Topics</h2>
            </div>
            {loading && <LoaderSpinner size="sm" />}
          </div>
          {topics.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-dashed border-gray-300 dark:border-[#fafafa33] flex items-center justify-center text-4xl">
                📝
              </div>
              <h3 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-3">
                No topics yet
              </h3>
              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-5">
                {searchQuery ? 'No topics match your search.' : 'Be the first to start a discussion in this category!'}
              </p>
              {user && !searchQuery && (
                <Link
                  to={`/forum/create?category=${id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
                >
                  Start Discussion
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4 p-6">
              {topics.map((topic) => (
                <Link
                  key={topic._id}
                  to={`/forum/topic/${topic._id}`}
                  className="block rounded-2xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] hover:border-gray-300 dark:hover:border-[#fafafa33] transition-all duration-200"
                >
                  <div className="px-5 py-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          {topic.isPinned && (
                            <span className="mt-1 text-base">📌</span>
                          )}
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] leading-snug">
                              {topic.title}
                            </h3>
                            {topic.content && (
                              <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] line-clamp-2">
                                {topic.content}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1E1E1E] text-[#171717] dark:text-[#fafafa]">
                            👤 {topic.authorName}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#17171799] dark:text-[#fafafa99]">
                            💬 {topic.replyCount} replies
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#17171799] dark:text-[#fafafa99]">
                            👀 {topic.viewCount} views
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.08em] text-[#17171766] dark:text-[#fafafa55] mb-1">
                          Last activity
                        </p>
                        <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">
                          {topic.lastPostAt ? formatDate(topic.lastPostAt) : formatDate(topic.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {topics.length > 0 && pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1E1E1E] rounded-b-2xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                  Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, pagination.total)} of {pagination.total} topics
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
                    Page {currentPage} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                    disabled={currentPage === pagination.pages}
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
  );
}

export default ForumCategory;
