import { useState, useEffect } from 'react';
import { Star, ThumbsUp, Flag, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';

function ReviewSection({ contentId, hasAccess, onReviewSubmitted }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userReview, setUserReview] = useState(null);

  // Review form state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [categories, setCategories] = useState([]);

  const availableCategories = [
    { value: 'accuracy', label: 'Accuracy' },
    { value: 'clarity', label: 'Clarity' },
    { value: 'completeness', label: 'Completeness' },
    { value: 'usefulness', label: 'Usefulness' },
    { value: 'originality', label: 'Originality' },
    { value: 'presentation', label: 'Presentation' }
  ];

  useEffect(() => {
    fetchReviews();
  }, [contentId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/marketplace/content/${contentId}`);
      const fetchedReviews = response.data.reviews || [];
      setReviews(fetchedReviews);
      
      // Check if current user has already reviewed
      if (user) {
        const existingReview = fetchedReviews.find(r => r.reviewerId === user.uid);
        setUserReview(existingReview);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user || !hasAccess) return;

    try {
      setSubmitting(true);
      
      if (categories.length === 0) {
        alert('Please select at least one category');
        return;
      }

      const response = await api.post(`/api/marketplace/content/${contentId}/review`, {
        rating,
        review: reviewText,
        categories
      });

      // Reset form
      setRating(5);
      setReviewText('');
      setCategories([]);
      setShowReviewForm(false);
      setEditingReview(null);

      // Refresh reviews
      await fetchReviews();
      
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }

      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert(error.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setRating(review.rating);
    setReviewText(review.review);
    setCategories(review.categories || []);
    setShowReviewForm(true);
  };

  const handleCategoryToggle = (categoryValue) => {
    setCategories(prev => 
      prev.includes(categoryValue)
        ? prev.filter(c => c !== categoryValue)
        : [...prev, categoryValue]
    );
  };

  const renderStars = (rating, interactive = false, onRatingChange = null) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={interactive ? 24 : 16}
        className={`${
          i < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
        onClick={interactive ? () => onRatingChange(i + 1) : undefined}
      />
    ));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#171717] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#171717] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-[#fafafacc]">
          Reviews ({reviews.length})
        </h3>
        
        {user && hasAccess && !userReview && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Write Review
          </button>
        )}

        {user && hasAccess && userReview && (
          <button
            onClick={() => handleEditReview(userReview)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Edit size={16} />
            Edit Review
          </button>
        )}
      </div>

      {/* Review Form */}
      {showReviewForm && user && hasAccess && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
          <h4 className="text-lg font-medium mb-4 text-gray-900 dark:text-[#fafafacc]">
            {editingReview ? 'Edit Your Review' : 'Write a Review'}
          </h4>
          
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rating *
              </label>
              <div className="flex items-center gap-1">
                {renderStars(rating, true, setRating)}
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  ({rating} star{rating !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review Categories * (Select at least one)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableCategories.map(category => (
                  <label
                    key={category.value}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={categories.includes(category.value)}
                      onChange={() => handleCategoryToggle(category.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{category.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review * (10-1000 characters)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows="4"
                minLength="10"
                maxLength="1000"
                required
                placeholder="Share your thoughts about this content..."
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {reviewText.length}/1000 characters
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || reviewText.length < 10 || categories.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : editingReview ? 'Update Review' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReviewForm(false);
                  setEditingReview(null);
                  setRating(5);
                  setReviewText('');
                  setCategories([]);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Access Message */}
      {!hasAccess && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            You need to purchase this content to leave a review.
          </p>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No reviews yet. Be the first to review this content!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review._id}
              className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {review.reviewerName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {review.reviewerName || 'Anonymous User'}
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    {review.categories && review.categories.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {review.categories.map(category => (
                          <span
                            key={category}
                            className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                          >
                            {availableCategories.find(c => c.value === category)?.label || category}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {review.review}
              </p>
              
              {review.helpful > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <ThumbsUp size={12} />
                  <span>{review.helpful} people found this helpful</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ReviewSection;