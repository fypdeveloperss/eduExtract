import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';
import api from '../utils/axios';
import MarketplaceContentSelectionModal from '../components/MarketplaceContentSelectionModal';
import { authenticatedFetch } from '../utils/auth';

function Marketplace() {
  const { user } = useAuth();
  const [content, setContent] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal state
  const [showPublishModal, setShowPublishModal] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchContent();
  }, [currentPage, selectedCategory, selectedDifficulty, selectedContentType, priceRange, sortBy]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/marketplace/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchContent = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        category: selectedCategory,
        difficulty: selectedDifficulty,
        contentType: selectedContentType,
        search: searchQuery,
        sortBy: sortBy === 'newest' ? 'createdAt' : sortBy === 'popular' ? 'views' : 'price',
        sortOrder: sortBy === 'price' ? 'asc' : 'desc'
      };

      const response = await api.get('/api/marketplace/content', { params });
      setContent(response.data.content || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalItems(response.data.pagination?.totalItems || 0);
    } catch (error) {
      console.error('Failed to fetch content:', error);
      setError('Failed to load marketplace content');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchContent();
  };

  const handlePublishContent = async (contentItems) => {
    try {
      const response = await authenticatedFetch('/api/marketplace/publish-existing', {
        method: 'POST',
        body: JSON.stringify({ contentItems }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to publish content');
      }

      // Show success message
      if (result.summary) {
        const { successful, failed, total } = result.summary;
        const approvedCount = result.results.filter(r => r.success && r.status === 'approved').length;
        const pendingCount = result.results.filter(r => r.success && r.status === 'pending').length;
        
        if (failed > 0) {
          alert(`Published ${successful} out of ${total} items. ${failed} items failed to publish. Check console for details.`);
          console.log('Failed items:', result.results.filter(r => !r.success));
        } else {
          let message = `Successfully published ${successful} items to the marketplace!`;
          if (approvedCount > 0) {
            message += `\n✅ ${approvedCount} items are now live and visible.`;
          }
          if (pendingCount > 0) {
            message += `\n⏳ ${pendingCount} items are pending admin approval.`;
          }
          alert(message);
        }
      }

      // Refresh content list to show new items
      fetchContent();
    } catch (error) {
      console.error('Error publishing content:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedDifficulty('');
    setSelectedContentType('');
    setPriceRange('all');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const formatPrice = (price, currency) => {
    if (price === 0) return 'Free';
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    return `${symbols[currency] || '$'}${price}`;
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      mathematics: '🔢',
      science: '🔬',
      history: '📚',
      literature: '📖',
      languages: '🌍',
      arts: '🎨',
      technology: '💻',
      business: '💼',
      health: '🏥',
      other: '📁'
    };
    return icons[category] || '📁';
  };

  if (loading && content.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-[#171717cc] dark:text-[#fafafacc]">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Discover Amazing Educational Content
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Access high-quality learning materials, study guides, and educational resources 
            created by experts and educators worldwide.
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex bg-white dark:bg-[#171717] rounded-lg shadow-lg overflow-hidden">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for courses, documents, study guides..."
                className="flex-1 px-6 py-4 text-[#171717cc] dark:text-[#fafafacc] text-lg focus:outline-none bg-transparent placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 text-white font-semibold transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {user && (
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/marketplace/upload"
                className="inline-flex items-center bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                <span className="mr-2">🚀</span>
                Upload New Content
              </Link>
              
              <button
                onClick={() => setShowPublishModal(true)}
                className="inline-flex items-center bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <span className="mr-2">📚</span>
                Publish My Content
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters and Controls */}
        <div className="bg-white dark:bg-[#171717] rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Category Filter */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 dark:border-[#2E2E2E] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Difficulty:</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="border border-gray-300 dark:border-[#2E2E2E] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Content Type Filter */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Type:</label>
              <select
                value={selectedContentType}
                onChange={(e) => setSelectedContentType(e.target.value)}
                className="border border-gray-300 dark:border-[#2E2E2E] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
              >
                <option value="">All Types</option>
                <option value="document">Documents</option>
                <option value="blog">Blog Posts</option>
                <option value="slides">Presentations</option>
                <option value="flashcards">Flashcards</option>
                <option value="quiz">Quizzes</option>
                <option value="summary">Summaries</option>
              </select>
            </div>

            {/* Price Range Filter */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Price:</label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="border border-gray-300 dark:border-[#2E2E2E] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
              >
                <option value="all">All Prices</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
                <option value="low">Under $10</option>
                <option value="medium">$10 - $25</option>
                <option value="high">Over $25</option>
              </select>
            </div>

            {/* Sort Options */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 dark:border-[#2E2E2E] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
              >
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
                <option value="price">Price: Low to High</option>
              </select>
            </div>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa] text-sm font-medium"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-[#171717cc] dark:text-[#fafafacc]">
            Showing {content.length} of {totalItems} results
            {selectedCategory && ` in ${categories.find(c => c.value === selectedCategory)?.label}`}
          </div>
          
          {!user && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <Link to="/login" className="font-medium underline">Sign in</Link> to upload content and access premium features
              </p>
            </div>
          )}
        </div>

        {/* Content Grid */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchContent}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : content.length === 0 ? (
          <div className="bg-white dark:bg-[#171717] rounded-2xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🔍</span>
            </div>
            <h3 className="text-xl font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-2">No content found</h3>
            <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6">
              Try adjusting your filters or search terms to find what you're looking for.
            </p>
            <button
              onClick={clearFilters}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {content.map((item) => (
              <Link
                key={item._id}
                to={`/marketplace/content/${item._id}`}
                className="bg-white dark:bg-[#171717] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden group"
              >
                {/* Content Preview */}
                <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center relative overflow-hidden">
                  <div className="text-6xl opacity-60 group-hover:scale-110 transition-transform duration-300">
                    {getCategoryIcon(item.category)}
                  </div>
                  
                  {/* Price Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      item.price === 0 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                    }`}>
                      {formatPrice(item.price, item.currency)}
                    </span>
                  </div>

                  {/* Content Type Badge */}
                  <div className="absolute bottom-3 left-3">
                    <span className="bg-white dark:bg-[#171717] bg-opacity-90 px-2 py-1 rounded text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">
                      {item.contentType}
                    </span>
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[#171717cc] dark:text-[#fafafacc] text-lg leading-tight group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                  
                  <p className="text-[#171717cc] dark:text-[#fafafacc] text-sm mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-[#171717cc] dark:text-[#fafafacc]">
                    <span className="flex items-center">
                      <span className="mr-1">📚</span>
                      {item.subject}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(item.difficulty)}`}>
                      {item.difficulty}
                    </span>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-[#2E2E2E] text-xs text-[#171717cc] dark:text-[#fafafacc]">
                    <span className="flex items-center">
                      <span className="mr-1">👁️</span>
                      {item.views || 0} views
                    </span>
                    <span className="flex items-center">
                      <span className="mr-1">❤️</span>
                      {item.likes || 0} likes
                    </span>
                    <span className="flex items-center">
                      <span className="mr-1">⭐</span>
                      {item.averageRating ? `${item.averageRating}/5` : 'No ratings'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-12">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 border rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Marketplace Content Selection Modal */}
      <MarketplaceContentSelectionModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onConfirm={handlePublishContent}
      />
    </div>
  );
}

export default Marketplace;


