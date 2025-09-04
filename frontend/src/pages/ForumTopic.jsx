import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';

function ForumTopic() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPost, setNewPost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchTopic();
  }, [id, currentPage]);

  const fetchTopic = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/forum/topics/${id}?page=${currentPage}&limit=10`);
      setTopic(response.data.topic);
      setPosts(response.data.posts);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Error fetching topic:', error);
      setError('Failed to load topic');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!newPost.trim()) return;

    try {
      setSubmitting(true);
      const response = await api.post(`/api/forum/topics/${id}/posts`, {
        content: newPost.trim()
      });
      
      setNewPost('');
      // Refresh the topic to show the new post
      await fetchTopic();
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPost = async (postId, newContent) => {
    try {
      await api.put(`/api/forum/posts/${postId}`, {
        content: newContent,
        editReason: 'Edited by user'
      });
      await fetchTopic();
    } catch (error) {
      console.error('Error editing post:', error);
      setError('Failed to edit post');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await api.delete(`/api/forum/posts/${postId}`);
      await fetchTopic();
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post');
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
          <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading topic...</p>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-4">
            Topic Not Found
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
      <div className="max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-[#171717cc] dark:text-[#fafafacc]">
            <li>
              <Link to="/forum" className="hover:text-blue-600 transition-colors">
                Forum
              </Link>
            </li>
            <li className="text-[#171717cc] dark:text-[#fafafacc]">/</li>
            <li>
              <Link 
                to={`/forum/category/${topic.categoryId._id}`} 
                className="hover:text-blue-600 transition-colors"
              >
                {topic.categoryId.name}
              </Link>
            </li>
            <li className="text-[#171717cc] dark:text-[#fafafacc]">/</li>
            <li className="text-[#171717cc] dark:text-[#fafafacc] font-medium">
              {topic.title}
            </li>
          </ol>
        </nav>

        {/* Topic Header */}
        <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-2">
                {topic.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
                <span>by {topic.authorName}</span>
                <span>•</span>
                <span>{formatDate(topic.createdAt)}</span>
                <span>•</span>
                <span>{topic.viewCount} views</span>
                <span>•</span>
                <span>{topic.replyCount} replies</span>
              </div>
            </div>
            <div className="flex space-x-2">
              {topic.isPinned && (
                <span className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded text-xs">
                  📌 Pinned
                </span>
              )}
              {topic.isLocked && (
                <span className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs">
                  🔒 Locked
                </span>
              )}
            </div>
          </div>
          
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <div className="text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap">
              {topic.content}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-4 mb-6">
          {posts.map((post, index) => (
            <div key={post._id} className="bg-white dark:bg-[#171717] rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {post.authorName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-[#171717cc] dark:text-[#fafafacc]">
                      {post.authorName}
                    </div>
                    <div className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                      {formatDate(post.createdAt)}
                      {post.isEdited && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          (edited)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {user && user.uid === post.authorId && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const newContent = prompt('Edit post:', post.content);
                        if (newContent && newContent !== post.content) {
                          handleEditPost(post._id, newContent);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePost(post._id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <div className="text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap">
                  {post.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, pagination.total)} of {pagination.total} posts
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

        {/* Reply Form */}
        {!topic.isLocked && (
          <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-4">
              {user ? 'Reply to this topic' : 'Please log in to reply'}
            </h3>
            
            {user ? (
              <form onSubmit={handleSubmitPost}>
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Write your reply..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc] mb-4"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !newPost.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    {submitting ? 'Posting...' : 'Post Reply'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center">
                <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">
                  You need to be logged in to reply to this topic.
                </p>
                <Link
                  to="/login"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Log In
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ForumTopic;
