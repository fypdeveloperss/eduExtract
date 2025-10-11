import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';

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
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading forum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-4">
            Community Forum
          </h1>
          <p className="text-xl text-[#171717cc] dark:text-[#fafafacc] max-w-3xl mx-auto">
            Connect with fellow learners, ask questions, and share knowledge in our community forum.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Create Topic Button */}
        {user && (
          <div className="mb-8 text-center">
            <Link
              to="/forum/create"
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <span className="mr-2">✏️</span>
              Start New Discussion
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Categories */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-6">
              Categories
            </h2>
            <div className="space-y-4">
              {categories.length === 0 ? (
                <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg p-8 text-center">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-2">
                    No Categories Available
                  </h3>
                  <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">
                    Forum categories are being set up. Please try refreshing the page.
                  </p>
                  <button
                    onClick={initializeCategories}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Initialize Categories
                  </button>
                </div>
              ) : (
                categories.map((category) => (
                <Link
                  key={category._id}
                  to={`/forum/category/${category._id}`}
                  className="block bg-white dark:bg-[#171717] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-2">
                        {category.name}
                      </h3>
                      <p className="text-[#171717cc] dark:text-[#fafafacc] mb-3">
                        {category.description}
                      </p>
                      <div className="flex items-center text-sm text-[#171717cc] dark:text-[#fafafacc]">
                        <span className="mr-4">📝 {category.topicCount} topics</span>
                        {category.lastTopic && (
                          <span>Last: {formatDate(category.lastTopic.createdAt)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-4xl opacity-60">
                      {category.name === 'General Discussion' && '💬'}
                      {category.name === 'Questions & Help' && '❓'}
                      {category.name === 'Study Groups' && '👥'}
                      {category.name === 'Announcements' && '📢'}
                    </div>
                  </div>
                </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Topics Sidebar */}
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-6">
              Recent Topics
            </h2>
            <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg p-6">
              {recentTopics.length === 0 ? (
                <p className="text-[#171717cc] dark:text-[#fafafacc] text-center">
                  No topics yet. Be the first to start a discussion!
                </p>
              ) : (
                <div className="space-y-4">
                  {recentTopics.map((topic) => (
                    <Link
                      key={topic._id}
                      to={`/forum/topic/${topic._id}`}
                      className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors"
                    >
                      <h4 className="font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1 line-clamp-2">
                        {topic.title}
                      </h4>
                      <div className="flex items-center justify-between text-sm text-[#171717cc] dark:text-[#fafafacc]">
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
