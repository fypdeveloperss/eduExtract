import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  Star, 
  X, 
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';

const FeedbackForm = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general_feedback',
    rating: 0
  });
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setFormData({
        subject: '',
        message: '',
        category: 'general_feedback',
        rating: 0
      });
      setError('');
      setIsSubmitted(false);
      setHoverRating(0);
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/feedback/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Fallback categories
      setCategories([
        { value: 'general_feedback', label: 'General Feedback' },
        { value: 'bug_report', label: 'Bug Report' },
        { value: 'feature_request', label: 'Feature Request' },
        { value: 'user_experience', label: 'User Experience' }
      ]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleRatingClick = (rating) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be signed in to submit feedback');
      return;
    }

    // Validation
    if (!formData.subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    
    if (!formData.message.trim()) {
      setError('Please enter your feedback message');
      return;
    }

    if (formData.subject.length > 200) {
      setError('Subject must be 200 characters or less');
      return;
    }

    if (formData.message.length > 2000) {
      setError('Message must be 2000 characters or less');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = await user.getIdToken();
      await api.post('/api/feedback', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setIsSubmitted(true);
      
      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setError(error.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-[#171717] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa]">
                  Share Your Feedback
                </h2>
                <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
                  Help us improve EduExtract
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#171717] dark:text-[#fafafa]" />
            </button>
          </div>

          {/* Content */}
          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
                Feedback Submitted!
              </h3>
              <p className="text-[#171717cc] dark:text-[#fafafacc]">
                Thank you for your feedback. We'll review it and get back to you if needed.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </motion.div>
              )}

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Brief summary of your feedback"
                  className="w-full px-3 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafa66] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  maxLength={200}
                  required
                />
                <div className="text-right text-xs text-[#171717cc] dark:text-[#fafafacc] mt-1">
                  {formData.subject.length}/200 characters
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-2">
                  Your Feedback *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Tell us what you think, what you'd like to see improved, or report any issues you've encountered..."
                  rows={6}
                  className="w-full px-3 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg bg-white dark:bg-[#121212] text-[#171717] dark:text-[#fafafa] placeholder-[#17171799] dark:placeholder-[#fafafa66] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  maxLength={2000}
                  required
                />
                <div className="text-right text-xs text-[#171717cc] dark:text-[#fafafacc] mt-1">
                  {formData.message.length}/2000 characters
                </div>
              </div>

              {/* Rating (Optional) */}
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-3">
                  Overall Rating (Optional)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingClick(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          star <= (hoverRating || formData.rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                  {formData.rating > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRatingClick(0)}
                      className="ml-2 text-xs text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Authentication Check */}
              {!user && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    You must be signed in to submit feedback.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-[#2E2E2E]">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors font-medium"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !user || !formData.subject.trim() || !formData.message.trim()}
                  className="flex-1 px-4 py-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Feedback
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FeedbackForm;