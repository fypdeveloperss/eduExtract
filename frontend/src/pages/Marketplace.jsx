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
  
  // Tab state
  const [activeTab, setActiveTab] = useState('browse');
  
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

  // Purchased content state
  const [purchasedContent, setPurchasedContent] = useState([]);
  const [purchasedLoading, setPurchasedLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (activeTab === 'browse') {
      fetchContent();
    } else if (activeTab === 'purchased' && user) {
      fetchPurchasedContent();
    }
  }, [activeTab, currentPage, selectedCategory, selectedDifficulty, selectedContentType, priceRange, sortBy, user]);

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

  const fetchPurchasedContent = async () => {
    try {
      setPurchasedLoading(true);
      const response = await api.get('/api/marketplace/purchases');
      console.log('Purchased content response:', response.data);
      setPurchasedContent(response.data || []);
    } catch (error) {
      console.error('Failed to fetch purchased content:', error);
      setError('Failed to load purchased content');
    } finally {
      setPurchasedLoading(false);
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

  if ((activeTab === 'browse' && loading && content.length === 0) || (activeTab === 'purchased' && purchasedLoading && purchasedContent.length === 0)) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#171717] dark:border-[#fafafa] mx-auto mb-4"></div>
          <p className="text-[#171717cc] dark:text-[#fafafacc]">
            {activeTab === 'browse' ? 'Loading marketplace...' : 'Loading purchases...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212]">
      {/* Hero Section */}
      <div className="bg-[#171717] dark:bg-[#121212] text-white dark:text-[#fafafa] py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-3">
            Discover Amazing Educational Content
          </h1>
          <p className="text-base md:text-lg text-[#fafafacc] dark:text-[#fafafacc] mb-6 max-w-3xl mx-auto">
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
                className="flex-1 px-4 py-2.5 text-[#171717cc] dark:text-[#fafafacc] text-base focus:outline-none bg-transparent placeholder-[#171717cc] dark:placeholder-[#fafafacc]"
              />
              <button
                type="submit"
                className="bg-[#171717] dark:bg-[#fafafa] hover:opacity-90 dark:text-[#171717] px-6 py-2.5 text-white font-semibold transition-opacity"
              >
                Search
              </button>
            </div>
          </form>

          {user && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/marketplace/upload"
                className="inline-flex items-center bg-white text-[#171717] dark:bg-[#171717] dark:text-[#fafafa] border border-gray-200 dark:border-[#fafafa1a] px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm"
              >
                <span className="mr-2">🚀</span>
                Upload New Content
              </Link>
              
              <button
                onClick={() => setShowPublishModal(true)}
                className="inline-flex items-center bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm"
              >
                <span className="mr-2">📚</span>
                Publish My Content
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg p-4 mb-6">
          <div className="flex space-x-1 mb-4">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-5 py-2 rounded-lg font-semibold transition-colors duration-200 text-sm ${
                activeTab === 'browse'
                  ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717]'
                  : 'text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-100 dark:hover:bg-[#1E1E1E]'
              }`}
            >
              <span className="mr-2">🔍</span>
              Browse Content
            </button>
            {user && (
              <button
                onClick={() => setActiveTab('purchased')}
                className={`px-5 py-2 rounded-lg font-semibold transition-colors duration-200 text-sm ${
                  activeTab === 'purchased'
                    ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717]'
                    : 'text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-100 dark:hover:bg-[#1E1E1E]'
                }`}
              >
                <span className="mr-2">🛒</span>
                My Purchases
              </button>
            )}
          </div>
        </div>

        {/* Filters and Controls - Only show for browse tab */}
        {activeTab === 'browse' && (
          <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Category Filter */}
            <div className="flex items-center space-x-3">
              <label className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 dark:border-[#fafafa1a] rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
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
            <div className="flex items-center space-x-3">
              <label className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Difficulty:</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="border border-gray-300 dark:border-[#fafafa1a] rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Content Type Filter */}
            <div className="flex items-center space-x-3">
              <label className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Type:</label>
              <select
                value={selectedContentType}
                onChange={(e) => setSelectedContentType(e.target.value)}
                className="border border-gray-300 dark:border-[#fafafa1a] rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
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
            <div className="flex items-center space-x-3">
              <label className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Price:</label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="border border-gray-300 dark:border-[#fafafa1a] rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
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
            <div className="flex items-center space-x-3">
              <label className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 dark:border-[#fafafa1a] rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white dark:bg-[#171717] text-[#171717cc] dark:text-[#fafafacc]"
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
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-[#171717cc] dark:text-[#fafafacc]">
            {activeTab === 'browse' ? (
              <>
                Showing {content.length} of {totalItems} results
                {selectedCategory && ` in ${categories.find(c => c.value === selectedCategory)?.label}`}
              </>
            ) : (
              <>
                {purchasedContent.length} purchased items
              </>
            )}
          </div>
          
          {!user && activeTab === 'browse' && (
            <div className="bg-gray-50 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#fafafa1a] rounded-lg px-3 py-1.5">
              <p className="text-xs text-[#171717cc] dark:text-[#fafafacc]">
                💡 <Link to="/login" className="font-medium underline hover:text-[#171717] dark:hover:text-[#fafafa]">Sign in</Link> to upload content and access premium features
              </p>
            </div>
          )}
        </div>

        {/* Content Grid */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={activeTab === 'browse' ? fetchContent : fetchPurchasedContent}
              className="mt-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] px-4 py-1.5 text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        ) : (activeTab === 'browse' ? content.length === 0 : purchasedContent.length === 0) ? (
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-xl shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-[#1E1E1E] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">{activeTab === 'browse' ? '🔍' : '🛒'}</span>
            </div>
            <h3 className="text-lg font-semibold text-[#171717cc] dark:text-[#fafafacc] mb-2">
              {activeTab === 'browse' ? 'No content found' : 'No purchases yet'}
            </h3>
            <p className="text-sm text-[#171717cc] dark:text-[#fafafacc] mb-4">
              {activeTab === 'browse' 
                ? 'Try adjusting your filters or search terms to find what you\'re looking for.'
                : 'Start exploring the marketplace to find amazing educational content to purchase.'
              }
            </p>
            {activeTab === 'browse' ? (
              <button
                onClick={clearFilters}
                className="bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] px-6 py-2 text-sm rounded-lg hover:opacity-90 transition-opacity"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('browse')}
                className="bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] px-6 py-2 text-sm rounded-lg hover:opacity-90 transition-opacity"
              >
                Browse Content
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(activeTab === 'browse' ? content : purchasedContent).map((item) => {
              const contentItem = activeTab === 'browse' ? item : item.contentId;
              const purchaseInfo = activeTab === 'purchased' ? item : null;
              
              // Debug logging for purchased content
              if (activeTab === 'purchased') {
                console.log('Purchase item:', item);
                console.log('Content item:', contentItem);
              }
              
              return (
              <Link
                key={contentItem._id}
                to={`/marketplace/content/${contentItem._id}`}
                className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 overflow-hidden group"
              >
                {/* Content Preview */}
                <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#1E1E1E] dark:to-[#2E2E2E] flex items-center justify-center relative overflow-hidden">
                  <div className="text-4xl opacity-60 group-hover:scale-110 transition-transform duration-300">
                    {getCategoryIcon(contentItem.category)}
                  </div>
                  
                  {/* Price Badge */}
                  <div className="absolute top-2 right-2">
                    {activeTab === 'purchased' ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                        ✅ Purchased
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        contentItem.price === 0 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                          : 'bg-gray-100 dark:bg-[#1E1E1E] text-[#171717cc] dark:text-[#fafafacc]'
                      }`}>
                        {formatPrice(contentItem.price, contentItem.currency)}
                      </span>
                    )}
                  </div>

                  {/* Content Type Badge */}
                  <div className="absolute bottom-2 left-2">
                    {contentItem?.contentType && (
                      <span className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#fafafa1a] bg-opacity-90 px-1.5 py-0.5 rounded text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">
                        {contentItem.contentType}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <h3 className="font-semibold text-[#171717cc] dark:text-[#fafafacc] text-base leading-tight group-hover:text-[#171717] dark:group-hover:text-[#fafafa] transition-colors">
                      {contentItem.title}
                    </h3>
                  </div>
                  
                  <p className="text-[#171717cc] dark:text-[#fafafacc] text-xs mb-2 line-clamp-2">
                    {contentItem.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-[#171717cc] dark:text-[#fafafacc]">
                    <span className="flex items-center">
                      <span className="mr-1">📚</span>
                      {contentItem?.subject || 'N/A'}
                    </span>
                    {contentItem?.difficulty && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(contentItem.difficulty)}`}>
                        {contentItem.difficulty}
                      </span>
                    )}
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#fafafa1a] text-xs text-[#171717cc] dark:text-[#fafafacc]">
                    {activeTab === 'purchased' ? (
                      <>
                        <span className="flex items-center">
                          <span className="mr-1">💰</span>
                          Paid {formatPrice(purchaseInfo.amount, purchaseInfo.currency)}
                        </span>
                        <span className="flex items-center">
                          <span className="mr-1">📅</span>
                          {new Date(purchaseInfo.purchasedAt).toLocaleDateString()}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center">
                          <span className="mr-1">👁️</span>
                          {contentItem.views || 0} views
                        </span>
                        <span className="flex items-center">
                          <span className="mr-1">❤️</span>
                          {contentItem.likes || 0} likes
                        </span>
                        <span className="flex items-center">
                          <span className="mr-1">⭐</span>
                          {contentItem.averageRating ? `${contentItem.averageRating}/5` : 'No ratings'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
            })}
          </div>
        )}

        {/* Pagination - Only for browse tab */}
        {activeTab === 'browse' && totalPages > 1 && (
          <div className="flex items-center justify-center mt-6">
            <nav className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-[#fafafa1a] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#1E1E1E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] border-transparent'
                      : 'border-gray-300 dark:border-[#fafafa1a] text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#1E1E1E]'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-[#fafafa1a] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#1E1E1E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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


