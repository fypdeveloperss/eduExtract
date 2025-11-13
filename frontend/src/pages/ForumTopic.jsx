import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowBigDown, ArrowBigUp } from 'lucide-react';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import PageLoader from '../components/PageLoader';
import LoaderSpinner from '../components/LoaderSpinner';

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
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    // Check if user has already viewed this topic in this session
    const viewedTopics = JSON.parse(sessionStorage.getItem('viewedTopics') || '[]');
    const hasViewedThisTopic = viewedTopics.includes(id);
    
    if (!hasViewedThisTopic) {
      // Mark as viewed in session storage
      viewedTopics.push(id);
      sessionStorage.setItem('viewedTopics', JSON.stringify(viewedTopics));
      fetchTopic(true); // Increment view count
    } else {
      fetchTopic(false); // Don't increment view count
    }
  }, [id, currentPage]);

  const fetchTopic = async (incrementView = false) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/forum/topics/${id}?page=${currentPage}&limit=10&incrementView=${incrementView}`);
      setTopic(response.data.topic);
      const normalizedPosts = (response.data.posts || []).map((post) => ({
        ...post,
        upvoteCount: post?.upvoteCount ?? 0,
        downvoteCount: post?.downvoteCount ?? 0,
        voters: post?.voters || {}
      }));
      setPosts(normalizedPosts);
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

  const openEditModal = (post) => {
    setEditingPost(post);
    setEditContent(post.content || '');
    setEditError('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingPost(null);
    setEditContent('');
    setEditSubmitting(false);
    setEditError('');
  };

  const handleEditPost = async () => {
    if (!editingPost) return;
    if (!editContent.trim()) {
      setEditError('Reply content cannot be empty.');
      return;
    }

    try {
      setEditSubmitting(true);
      await api.put(`/api/forum/posts/${editingPost._id}`, {
        content: editContent.trim(),
        editReason: 'Edited by user'
      });
      closeEditModal();
      await fetchTopic();
    } catch (error) {
      console.error('Error editing post:', error);
      setEditError(error.response?.data?.error || 'Failed to update reply.');
    } finally {
      setEditSubmitting(false);
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

  const getUserVote = (post) => {
    if (!user) return 0;
    const voters = post?.voters || {};
    const voteValue = voters[user.uid];
    if (voteValue === 1) return 1;
    if (voteValue === -1) return -1;
    return 0;
  };

  const handleVote = async (postId, direction) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const targetPost = posts.find((post) => post._id === postId);
    if (!targetPost) return;

    const currentVote = getUserVote(targetPost);
    const nextVote = currentVote === direction ? 0 : direction;

    try {
      const response = await api.post(`/api/forum/posts/${postId}/vote`, { vote: nextVote });
      const updated = response.data.post || {};
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                upvoteCount: updated.upvoteCount ?? 0,
                downvoteCount: updated.downvoteCount ?? 0,
                voters: updated.voters || {}
              }
            : post
        )
      );
      if (error) {
        setError('');
      }
    } catch (err) {
      console.error('Error voting on post:', err);
      setError(err.response?.data?.error || 'Failed to submit vote');
    }
  };
 
  if (loading) {
    return <PageLoader />;
  }

  if (!topic) {
     return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#171717cc] dark:text-[#fafafacc] mb-4">
            Topic Not Found
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
    <>
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
              <li>
                <Link
                  to={`/forum/category/${topic.categoryId._id}`}
                  className="hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors"
                >
                  {topic.categoryId.name}
                </Link>
              </li>
              <li className="text-[#17171733] dark:text-[#fafafa22]">/</li>
              <li className="text-[#171717] dark:text-[#fafafa] font-medium">
                {topic.title}
              </li>
            </ol>
          </nav>

          {/* Topic Header */}
          <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl shadow-lg p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-3">
                  {topic.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                  <span>by {topic.authorName}</span>
                  <span className="text-[#17171733] dark:text-[#fafafa22]">•</span>
                  <span>{formatDate(topic.createdAt)}</span>
                  <span className="text-[#17171733] dark:text-[#fafafa22]">•</span>
                  <span>{topic.viewCount} views</span>
                  <span className="text-[#17171733] dark:text-[#fafafa22]">•</span>
                  <span>{topic.replyCount} replies</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {topic.isPinned && (
                  <span className="px-3 py-1 rounded-full border border-gray-200 dark:border-[#2E2E2E] text-xs text-[#171717] dark:text-[#fafafa]">📌 Pinned</span>
                )}
                {topic.isLocked && (
                  <span className="px-3 py-1 rounded-full border border-gray-200 dark:border-[#2E2E2E] text-xs text-[#171717] dark:text-[#fafafa]">🔒 Locked</span>
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
            <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
              {error}
            </div>
          )}

          {/* Posts */}
          <div className="space-y-4">
            {posts.map((post) => {
              const upvotes = post?.upvoteCount ?? 0;
              const downvotes = post?.downvoteCount ?? 0;
              const score = upvotes - downvotes;
              const userVote = getUserVote(post);

              return (
                <div key={post._id} className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2E2E2E] flex items-center justify-center">
                        <span className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                          {post.authorName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-[#171717] dark:text-[#fafafa]">
                          {post.authorName}
                        </div>
                        <div className="text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                          {formatDate(post.createdAt)}
                          {post.isEdited && (
                            <span className="ml-2 text-xs text-[#17171766] dark:text-[#fafafa66]">
                              (edited)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {user && (user.uid === post.authorId || user.isAdmin) && (
                      <div className="flex items-center gap-2">
                        {user.uid === post.authorId && (
                          <button
                            onClick={() => openEditModal(post)}
                            className="px-3 py-1 text-xs md:text-sm border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className="px-3 py-1 text-xs md:text-sm border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#1E1E1E] transition-colors"
                          title={user.uid === post.authorId ? 'Delete your post' : 'Admin: Delete this post'}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#161616] px-3 py-2 shadow-[0_6px_18px_-12px_rgba(0,0,0,0.25)]">
                    <button
                      onClick={() => handleVote(post._id, 1)}
                      className={`group h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-200 ${
                        userVote === 1
                          ? 'bg-[#171717] text-white hover:shadow-[0_6px_16px_-6px_rgba(23,23,23,0.45)] dark:bg-[#fafafa] dark:text-[#171717]'
                          : 'bg-transparent text-[#171717] dark:text-[#fafafa] hover:bg-gray-100/80 dark:hover:bg-[#1f1f1f]'
                      }`}
                      aria-label="Upvote reply"
                    >
                      <ArrowBigUp className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col items-center mx-1 min-w-[2.75rem]">
                      <span className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] leading-none">{score}</span>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#17171766] dark:text-[#fafafa55]">Score</span>
                    </div>
                    <button
                      onClick={() => handleVote(post._id, -1)}
                      className={`group h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-200 ${
                        userVote === -1
                          ? 'bg-[#171717] text-white hover:shadow-[0_6px_16px_-6px_rgba(23,23,23,0.45)] dark:bg-[#fafafa] dark:text-[#171717]'
                          : 'bg-transparent text-[#171717] dark:text-[#fafafa] hover:bg-gray-100/80 dark:hover:bg-[#1f1f1f]'
                      }`}
                      aria-label="Downvote reply"
                    >
                      <ArrowBigDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-[#1A1A1A]">
                      <ArrowBigUp className="w-3.5 h-3.5 text-[#171717b3] dark:text-[#fafafa99]" />
                      {upvotes} upvote{upvotes === 1 ? '' : 's'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-[#1A1A1A]">
                      <ArrowBigDown className="w-3.5 h-3.5 text-[#171717b3] dark:text-[#fafafa99]" />
                      {downvotes} downvote{downvotes === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <div className="text-[#171717cc] dark:text-[#fafafacc] whitespace-pre-wrap">
                      {post.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-xl p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-xs md:text-sm text-[#17171799] dark:text-[#fafafa99]">
                  Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, pagination.total)} of {pagination.total} posts
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

          {/* Reply Form */}
          {!topic.isLocked && (
            <div className="border border-gray-200 dark:border-[#fafafa1a] bg-white dark:bg-[#171717] rounded-2xl p-6 md:p-8">
              <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-4">
                {user ? 'Reply to this topic' : 'Please log in to reply'}
              </h3>

              {user ? (
                <form onSubmit={handleSubmitPost}>
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Write your reply..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafa66] mb-4"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting || !newPost.trim()}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      {submitting ? (
                        <>
                          <LoaderSpinner size="sm" />
                          Posting...
                        </>
                      ) : (
                        'Post Reply'
                      )}
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
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity text-sm font-semibold"
                  >
                    Log In
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/45 dark:bg-black/70"
            onClick={closeEditModal}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-2xl bg-white dark:bg-[#171717] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#fafafa1a] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1E1E1E]">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[#17171766] dark:text-[#fafafa55]">Edit Reply</p>
                <h3 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa]">Make adjustments</h3>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2E2E2E] text-[#17171799] dark:text-[#fafafa99]"
                aria-label="Close edit reply modal"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa]">
                Reply content
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafa66]"
                placeholder="Update your reply to keep the conversation going."
              />

              {editError && (
                <div className="border border-[#B91C1C33] dark:border-[#F8717199] bg-red-50/60 dark:bg-[#F8717114] text-sm text-[#B91C1C] dark:text-[#F87171] rounded-lg px-4 py-3">
                  {editError}
                </div>
              )}
            </div>

            <div className="px-6 py-5 border-t border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1E1E1E] flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 gap-3">
              <button
                onClick={closeEditModal}
                className="px-6 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-sm font-medium text-[#171717] dark:text-[#fafafa] hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditPost}
                disabled={editSubmitting}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
              >
                {editSubmitting ? (
                  <>
                    <LoaderSpinner size="sm" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ForumTopic;
