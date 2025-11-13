import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import PageLoader from '../components/PageLoader';

function Forum() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [recentTopics, setRecentTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, topicsRes] = await Promise.all([
        api.get('/api/forum/categories'),
        api.get('/api/forum/topics?limit=10')
      ]);
      
      const fetchedCategories = categoriesRes.data.categories || [];
      setCategories(fetchedCategories);
      setRecentTopics(topicsRes.data.topics || []);
      
      // If no categories exist, try to initialize default ones
      if (fetchedCategories.length === 0) {
        await initializeCategories();
      }
    } catch (error) {
      console.error('Error fetching forum data:', error);
      setError('Failed to load forum data');
    } finally {
      setLoading(false);
    }
  };

  const initializeCategories = async () => {
    try {
      const response = await api.post('/api/forum/init-categories');
      if (response.data.success) {
        setCategories(response.data.categories || []);
        console.log('Default categories initialized');
      }
    } catch (error) {
      console.error('Error initializing categories:', error);
      // Don't show error to user as this is automatic
    }
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

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] py-10 md:py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl shadow-lg px-6 py-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-3">
            Community Forum
          </h1>
          <p className="text-base md:text-lg text-[#171717cc] dark:text-[#fafafacc] max-w-3xl mx-auto">
            Connect with fellow learners, ask questions, and share knowledge across a growing learning community.
          </p>

          {user && (
            <div className="mt-6">
              <Link
                to="/forum/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
              >
                ✏️ Start New Discussion
              </Link>
            </div>
          )}
        </div>

        {error && (
          <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold text-[#171717] dark:text-[#fafafa]">Categories</h2>
              <span className="text-xs text-[#171717cc] dark:text-[#fafafacc]">{categories.length} available</span>
            </div>

            <div className="space-y-4">
              {categories.length === 0 ? (
                <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                    📚
                  </div>
                  <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-2">No Categories Yet</h3>
                  <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-4">
                    Forum categories are being set up. Try refreshing or initialize default categories.
                  </p>
                  <button
                    onClick={initializeCategories}
                    className="px-5 py-2 border border-gray-200 dark:border-[#fafafa1a] rounded-lg text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] transition-colors text-sm font-medium"
                  >
                    Initialize Categories
                  </button>
                </div>
              ) : (
                categories.map((category) => (
                  <Link
                    key={category._id}
                    to={`/forum/category/${category._id}`}
                    className="block border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] rounded-xl flex items-center justify-center text-2xl">
                        {category.name === 'General Discussion' && '💬'}
                        {category.name === 'Questions & Help' && '❓'}
                        {category.name === 'Study Groups' && '👥'}
                        {category.name === 'Announcements' && '📢'}
                        {!['General Discussion','Questions & Help','Study Groups','Announcements'].includes(category.name) && '📚'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-semibold text-[#171717] dark:text-[#fafafa]">{category.name}</h3>
                          <span className="text-xs px-2 py-0.5 border border-gray-200 dark:border-[#2E2E2E] rounded-full text-[#171717cc] dark:text-[#fafafacc]">
                            {category.topicCount} topics
                          </span>
                        </div>
                        <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-3 line-clamp-2">{category.description}</p>
                        <div className="flex items-center justify-between text-xs text-[#171717cc] dark:text-[#fafafacc]">
                          <span>Created {formatDate(category.createdAt)}</span>
                          {category.lastTopic && <span>Last activity {formatDate(category.lastTopic.createdAt)}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Topics Sidebar */}
          <div className="space-y-4">
            <h2 className="text-lg md:text-xl font-semibold text-[#171717] dark:text-[#fafafa]">Recent Topics</h2>
            <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-5 shadow-sm">
              {recentTopics.length === 0 ? (
                <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] text-center">
                  No topics yet. Be the first to start a discussion!
                </p>
              ) : (
                <div className="space-y-3">
                  {recentTopics.map((topic) => (
                    <Link
                      key={topic._id}
                      to={`/forum/topic/${topic._id}`}
                      className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1E1E1E] transition-colors"
                    >
                      <h4 className="font-medium text-sm text-[#171717] dark:text-[#fafafa] mb-1 line-clamp-2">{topic.title}</h4>
                      <div className="flex items-center justify-between text-xs text-[#171717cc] dark:text-[#fafafacc]">
                        <span>by {topic.authorName}</span>
                        <span>{topic.replyCount} replies</span>
                      </div>
                      <div className="text-xs text-[#171717cc] dark:text-[#fafafacc] mt-1">
                        {formatDate(topic.createdAt)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Forum;
