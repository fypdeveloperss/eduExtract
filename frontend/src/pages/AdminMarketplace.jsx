import { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import LoaderSpinner from '../components/LoaderSpinner';
import { Search, CheckCircle, XCircle, Package, Calendar, DollarSign, FileText, Tag, ArrowLeft, LineChart, PieChart, Activity, TrendingUp, Wallet, Clock } from 'lucide-react';

function AdminMarketplace() {
  const { user, isAdmin, adminLoading } = useAuth();
  const navigate = useNavigate();
  
  const [pendingContent, setPendingContent] = useState([]);
  const [filteredContent, setFilteredContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutsPagination, setPayoutsPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 20
  });
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('');
  const [transactionModal, setTransactionModal] = useState({
    open: false,
    payoutId: null,
    transactionId: ''
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsData, setAnalyticsData] = useState({
    metrics: {
      totalListings: 0,
      approvedListings: 0,
      pendingListings: 0,
      rejectedListings: 0,
      totalRevenue: 0,
      revenue30d: 0,
      activeCreators: 0,
      averagePrice: 0
    },
    salesTrend: [],
    categoryBreakdown: [],
    topContent: [],
    topCreators: [],
    recentTransactions: []
  });
  const [activityRecords, setActivityRecords] = useState([]);
  const [activityPagination, setActivityPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10
  });
  const [activityLoading, setActivityLoading] = useState(false);

  // Redirect if not admin
  const ACTIVITY_PAGE_SIZE = 10;

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin && activeTab === 'analytics') {
      fetchAnalytics();
      fetchActivity(1);
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (isAdmin && activeTab === 'moderation') {
      fetchPendingContent();
    }
    if (isAdmin && activeTab === 'payouts') {
      fetchPayouts();
    }
  }, [isAdmin, activeTab, payoutStatusFilter]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContent(pendingContent);
    } else {
      const filtered = pendingContent.filter(
        (content) =>
          content.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          content.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          content.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          content.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContent(filtered);
    }
  }, [searchQuery, pendingContent]);

  const formatNumber = (value, fallback = '—') => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      return fallback;
    }
    return Number(value).toLocaleString();
  };

  const formatCurrencyCompact = (value = 0, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(value || 0);
    } catch {
      return `$${Number(value || 0).toLocaleString()}`;
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await api.get('/api/admin/marketplace/analytics');
      setAnalyticsData(response.data);
      setAnalyticsError('');
    } catch (error) {
      console.error('Failed to fetch marketplace analytics:', error);
      setAnalyticsError('Failed to load marketplace analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchActivity = async (page = 1) => {
    try {
      setActivityLoading(true);
      const response = await api.get('/api/admin/marketplace/activity', {
        params: { page, limit: ACTIVITY_PAGE_SIZE }
      });
      setActivityRecords(response.data.records || []);
      setActivityPagination(response.data.pagination || {
        page,
        pages: 1,
        total: 0,
        limit: ACTIVITY_PAGE_SIZE
      });
    } catch (error) {
      console.error('Failed to fetch marketplace activity:', error);
      setAnalyticsError('Failed to load activity feed');
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchPendingContent = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/marketplace/pending');
      setPendingContent(response.data.content || []);
      setFilteredContent(response.data.content || []);
    } catch (error) {
      console.error('Failed to fetch pending content:', error);
      setError('Failed to load pending content');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayouts = async (page = 1) => {
    try {
      setPayoutsLoading(true);
      const params = { page, limit: 20 };
      if (payoutStatusFilter) {
        params.status = payoutStatusFilter;
      }
      const response = await api.get('/api/admin/marketplace/payouts', { params });
      setPayouts(response.data.payouts || []);
      setPayoutsPagination(response.data.pagination || {
        page,
        pages: 1,
        total: 0,
        limit: 20
      });
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
      setError('Failed to load payout requests');
    } finally {
      setPayoutsLoading(false);
    }
  };

  const handlePayoutApprove = async (payoutId) => {
    try {
      setActionLoading(prev => ({ ...prev, [payoutId]: 'approving' }));
      setError('');
      setSuccess('');
      await api.post(`/api/admin/marketplace/payouts/${payoutId}/approve`);
      setSuccess('Payout approved successfully');
      fetchPayouts(payoutsPagination.page);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to approve payout:', error);
      setError(error.response?.data?.error || 'Failed to approve payout');
    } finally {
      setActionLoading(prev => ({ ...prev, [payoutId]: null }));
    }
  };

  const handlePayoutComplete = async (payoutId, transactionId = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [payoutId]: 'completing' }));
      setError('');
      setSuccess('');
      await api.post(`/api/admin/marketplace/payouts/${payoutId}/complete`, { transactionId });
      setSuccess('Payout marked as completed');
      fetchPayouts(payoutsPagination.page);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to complete payout:', error);
      setError(error.response?.data?.error || 'Failed to complete payout');
    } finally {
      setActionLoading(prev => ({ ...prev, [payoutId]: null }));
    }
  };

  const closeTransactionModal = () => {
    setTransactionModal({
      open: false,
      payoutId: null,
      transactionId: ''
    });
  };

  const openTransactionModal = (payoutId) => {
    setTransactionModal({
      open: true,
      payoutId,
      transactionId: ''
    });
  };

  const submitTransactionModal = () => {
    if (!transactionModal.payoutId) return;
    handlePayoutComplete(transactionModal.payoutId, transactionModal.transactionId.trim());
    closeTransactionModal();
  };

  const handlePayoutReject = async (payoutId, reason = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [payoutId]: 'rejecting' }));
      setError('');
      setSuccess('');
      await api.post(`/api/admin/marketplace/payouts/${payoutId}/reject`, { reason });
      setSuccess('Payout rejected');
      fetchPayouts(payoutsPagination.page);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to reject payout:', error);
      setError(error.response?.data?.error || 'Failed to reject payout');
    } finally {
      setActionLoading(prev => ({ ...prev, [payoutId]: null }));
    }
  };

  const handlePayoutPageChange = (direction) => {
    const nextPage =
      direction === 'next'
        ? payoutsPagination.page + 1
        : payoutsPagination.page - 1;
    if (nextPage < 1 || nextPage > payoutsPagination.pages) return;
    fetchPayouts(nextPage);
  };

  const handleActivityPageChange = (direction) => {
    const nextPage =
      direction === 'next'
        ? activityPagination.page + 1
        : activityPagination.page - 1;
    if (nextPage < 1 || nextPage > activityPagination.pages) return;
    fetchActivity(nextPage);
  };

  const handleApprove = async (contentId) => {
    try {
      setActionLoading(prev => ({ ...prev, [contentId]: 'approving' }));
      setError('');
      setSuccess('');
      
      await api.post(`/api/marketplace/approve/${contentId}`);
      
      setPendingContent(prev => prev.filter(item => item._id !== contentId));
      setSuccess('Content approved successfully');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to approve content:', error);
      setError('Failed to approve content');
    } finally {
      setActionLoading(prev => ({ ...prev, [contentId]: null }));
    }
  };

  const handleReject = async (contentId, reason = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [contentId]: 'rejecting' }));
      setError('');
      setSuccess('');
      
      await api.post(`/api/marketplace/reject/${contentId}`, {
        reason: reason || 'Content does not meet quality standards'
      });
      
      setPendingContent(prev => prev.filter(item => item._id !== contentId));
      setSuccess('Content rejected successfully');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to reject content:', error);
      setError('Failed to reject content');
    } finally {
      setActionLoading(prev => ({ ...prev, [contentId]: null }));
    }
  };

  const formatPrice = (price, currency) => {
    if (price === 0) return 'Free';
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    return `${symbols[currency] || '$'}${price}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
  };

  const pendingReviewsCount = pendingContent.length;
  const pendingPayoutsCount = payouts.filter((p) => p.status === 'pending').length;
  const processingPayoutsCount = payouts.filter((p) => p.status === 'processing').length;
  const revenue30d = analyticsData.metrics?.revenue30d || 0;
  const heroStats = [
    {
      label: 'Pending Reviews',
      value: formatNumber(pendingReviewsCount),
      tone: 'from-emerald-500/15 to-transparent'
    },
    {
      label: 'Pending Payouts',
      value: formatNumber(pendingPayoutsCount),
      tone: 'from-amber-500/15 to-transparent'
    },
    {
      label: '30d Revenue',
      value: formatCurrencyCompact(revenue30d),
      tone: 'from-sky-500/15 to-transparent'
    },
    {
      label: 'Processing Payouts',
      value: formatNumber(processingPayoutsCount),
      tone: 'from-purple-500/15 to-transparent'
    }
  ];

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center px-4">
        <div className="flex flex-col items-center space-y-3 text-center text-[#171717cc] dark:text-[#fafafacc]">
          <LoaderSpinner size="xl" />
          <p>Checking admin status...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-lg shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 border border-gray-200 dark:border-[#2E2E2E] bg-gray-100 dark:bg-[#1f1f1f] rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">Access Denied</h1>
          <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">You don't have admin privileges.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-semibold"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (activeTab === 'moderation' && loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center px-4">
        <div className="flex flex-col items-center space-y-3 text-center text-[#171717cc] dark:text-[#fafafacc]">
          <LoaderSpinner size="xl" />
          <p>Loading pending content...</p>
        </div>
      </div>
    );
  }

  const renderAnalyticsTab = () => {
    if (analyticsLoading) {
      return (
        <div className="bg-white dark:bg-[#171717] rounded-xl shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-12 text-center">
          <LoaderSpinner size="lg" />
          <p className="mt-4 text-sm text-[#171717cc] dark:text-[#fafafacc]">
            Gathering marketplace insights...
          </p>
        </div>
      );
    }

    const metricCards = [
      {
        title: 'Total Listings',
        value: analyticsData.metrics.totalListings,
        description: 'All marketplace submissions',
        icon: Package,
        accent: 'bg-blue-100 dark:bg-blue-900/40'
      },
      {
        title: 'Pending Reviews',
        value: analyticsData.metrics.pendingListings,
        description: 'Awaiting approval',
        icon: FileText,
        accent: 'bg-orange-100 dark:bg-orange-900/30'
      },
      {
        title: 'Revenue (30d)',
        value: formatCurrency(analyticsData.metrics.revenue30d),
        description: 'Last 30 days',
        icon: TrendingUp,
        accent: 'bg-emerald-100 dark:bg-emerald-900/30'
      },
      {
        title: 'Active Creators',
        value: analyticsData.metrics.activeCreators,
        description: 'Generating paid sales',
        icon: Activity,
        accent: 'bg-purple-100 dark:bg-purple-900/30'
      }
    ];

  return (
      <div className="space-y-8">
        {analyticsError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
            {analyticsError}
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {metricCards.map((card) => (
            <div
              key={card.title}
              className="bg-white dark:bg-[#171717] rounded-xl border border-gray-200 dark:border-[#2E2E2E] p-5 flex items-center gap-4 shadow-sm"
            >
              <div className={`p-3 rounded-xl ${card.accent}`}>
                <card.icon className="w-5 h-5 text-[#171717] dark:text-[#fafafa]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#17171799] dark:text-[#fafafacc99]">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">
                  {card.value}
                </p>
                <p className="text-xs text-[#17171799] dark:text-[#fafafacc99]">{card.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue + Category Breakdown */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
            <div>
                <p className="text-xs uppercase tracking-wide text-[#17171799] dark:text-[#fafafacc99]">
                  Sales Trend (30d)
                </p>
                <p className="text-xl font-semibold text-[#171717] dark:text-[#fafafa]">
                  {formatCurrency(analyticsData.metrics.revenue30d)} revenue
                </p>
              </div>
              <LineChart className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" />
            </div>
            {analyticsData.salesTrend.length === 0 ? (
              <p className="text-sm text-[#17171799] dark:text-[#fafafacc99]">No sales yet.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {analyticsData.salesTrend.map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between text-sm text-[#171717cc] dark:text-[#fafafacc]"
                  >
                    <span>{day.date}</span>
                    <div className="flex items-center gap-3">
                      <span>{formatCurrency(day.revenue)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1f1f1f]">
                        {day.orders} orders
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#17171799] dark:text-[#fafafacc99]">
                  Category Performance
                </p>
                <p className="text-xl font-semibold text-[#171717] dark:text-[#fafafa]">
                  Top earning segments
                </p>
              </div>
              <PieChart className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" />
            </div>
            {analyticsData.categoryBreakdown.length === 0 ? (
              <p className="text-sm text-[#17171799] dark:text-[#fafafacc99]">No category data.</p>
            ) : (
              <div className="space-y-3">
                {analyticsData.categoryBreakdown.map((category) => (
                  <div key={category.category} className="border border-gray-100 dark:border-[#2E2E2E] rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm text-[#171717cc] dark:text-[#fafafacc]">
                      <span className="font-medium capitalize">{category.category}</span>
                      <span>{formatCurrency(category.revenue)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-[#17171799] dark:text-[#fafafacc99]">
                      <span>{category.listings} listings</span>
                      <span>{category.sales} orders</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Content & Creators */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">Top Content</p>
              <FileText className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
            </div>
            {analyticsData.topContent.length === 0 ? (
              <p className="text-sm text-[#17171799] dark:text-[#fafafacc99]">No paid content yet.</p>
            ) : (
              <div className="space-y-3">
                {analyticsData.topContent.map((item) => (
                  <div key={item.contentId} className="border border-gray-100 dark:border-[#2E2E2E] rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm text-[#171717cc] dark:text-[#fafafacc]">
                      <span className="font-semibold">{item.title}</span>
                      <span>{formatCurrency(item.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#17171799] dark:text-[#fafafacc99] mt-1">
                      <span>{item.sales} sales</span>
                      <span>{item.creator?.name || 'Unknown'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </div>

          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">Top Creators</p>
              <Activity className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
            </div>
            {analyticsData.topCreators.length === 0 ? (
              <p className="text-sm text-[#17171799] dark:text-[#fafafacc99]">No creator data.</p>
            ) : (
              <div className="space-y-3">
                {analyticsData.topCreators.map((creator) => (
                  <div key={creator.userId} className="border border-gray-100 dark:border-[#2E2E2E] rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm text-[#171717cc] dark:text-[#fafafacc]">
                      <span className="font-semibold">{creator.name}</span>
                      <span>{formatCurrency(creator.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#17171799] dark:text-[#fafafacc99] mt-1">
                      <span>{creator.sales} sales</span>
                      <span>{creator.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">Recent Transactions</p>
          </div>

          {activityLoading ? (
            <div className="flex items-center gap-3 text-sm text-[#17171799] dark:text-[#fafafacc99]">
              <LoaderSpinner size="sm" /> Loading activity...
            </div>
          ) : activityRecords.length === 0 ? (
            <p className="text-sm text-[#17171799] dark:text-[#fafafacc99]">No transactions recorded.</p>
          ) : (
            <>
              <div className="space-y-3">
                {activityRecords.map((record) => (
                  <div key={record.purchaseId} className="border border-gray-100 dark:border-[#2E2E2E] rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm text-[#171717cc] dark:text-[#fafafacc]">
                      <span>{record.content?.title || 'Marketplace content'}</span>
                      <span>{formatCurrency(record.amount)}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-xs text-[#17171799] dark:text-[#fafafacc99] mt-1">
                      <span>Buyer: {record.buyer?.name || record.buyer?.email || 'Unknown'}</span>
                      <span>Seller: {record.seller?.name || record.seller?.email || 'Unknown'}</span>
                      <span>{formatDateTime(record.purchasedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {activityPagination.pages > 1 && (
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button
                    onClick={() => handleActivityPageChange('prev')}
                    disabled={activityPagination.page === 1}
                    className="px-3 py-1.5 text-xs border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-[#17171799] dark:text-[#fafafacc99]">
                    Page {activityPagination.page} of {activityPagination.pages}
                  </span>
                  <button
                    onClick={() => handleActivityPageChange('next')}
                    disabled={activityPagination.page >= activityPagination.pages}
                    className="px-3 py-1.5 text-xs border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderModerationTab = () => (
    <>
      {/* Stats Card */}
      <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6 mb-8">
        <div className="flex items-center">
          <div className="p-3 bg-[#171717] dark:bg-[#fafafa] rounded-lg">
            <Package className="w-6 h-6 text-white dark:text-[#171717]" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-[#171717cc] dark:text-[#fafafacc]">Pending Review</p>
            <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">{pendingContent.length}</p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
          <input
            type="text"
            placeholder="Search content by title, description, subject, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Pending Content List */}
      {filteredContent.length === 0 ? (
        <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#171717cc] dark:text-[#fafafacc]" />
          </div>
          <h3 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
            {searchQuery ? 'No Results Found' : 'All Caught Up!'}
          </h3>
          <p className="text-[#171717cc] dark:text-[#fafafacc]">
            {searchQuery ? 'Try adjusting your search query' : 'No pending content to review.'}
          </p>
          </div>
        ) : (
          <div className="space-y-6">
          {filteredContent.map((content) => (
            <div key={content._id} className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header with Category Icon and Badges */}
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-3xl">{getCategoryIcon(content.category)}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] capitalize">
                            {content.category}
                          </span>
                        <span className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f] text-[#171717] dark:text-[#fafafa] capitalize">
                            {content.difficulty}
                          </span>
                        <span className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-200 dark:border-[#2E2E2E] bg-gray-50 dark:bg-[#1f1f1f] text-[#171717] dark:text-[#fafafa]">
                            {content.contentType}
                          </span>
                      </div>
                    </div>

                    {/* Title */}
                    {content.title && (
                      <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-3">
                        {content.title}
                      </h3>
                    )}

                    {/* Description */}
                    <p className="text-[#171717cc] dark:text-[#fafafacc] mb-6 line-clamp-3">
                      {content.description}
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <FileText className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                          <span className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Subject</span>
                        </div>
                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">{content.subject}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <DollarSign className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                          <span className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Price</span>
                        </div>
                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                          {formatPrice(content.price, content.currency)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <FileText className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                          <span className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Plagiarism</span>
                        </div>
                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                          {content.plagiarismScore ?? 'N/A'}%
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                          <span className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Uploaded</span>
                        </div>
                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                          {formatDate(content.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    {content.tags && content.tags.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Tag className="w-4 h-4 text-[#171717cc] dark:text-[#fafafacc]" />
                          <span className="text-sm font-medium text-[#171717] dark:text-[#fafafa]">Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {content.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2.5 py-1 bg-gray-100 dark:bg-[#2E2E2E] text-[#171717] dark:text-[#fafafa] rounded-lg text-xs font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => handleApprove(content._id)}
                      disabled={actionLoading[content._id]}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {actionLoading[content._id] === 'approving' ? (
                        <>
                          <LoaderSpinner size="sm" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleReject(content._id)}
                      disabled={actionLoading[content._id]}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {actionLoading[content._id] === 'rejecting' ? (
                        <>
                          <LoaderSpinner size="sm" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </>
  );

  const renderPayoutsTab = () => {
    const formatCurrency = (amount, currency = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD'
      }).format(amount);
    };

    const formatDateTime = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getStatusBadge = (status) => {
      const statusConfig = {
        pending: {
          icon: Clock,
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-700 dark:text-yellow-300',
          border: 'border-yellow-400 dark:border-yellow-800',
          label: 'Pending'
        },
        processing: {
          icon: Activity,
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-400 dark:border-blue-800',
          label: 'Processing'
        },
        completed: {
          icon: CheckCircle,
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-700 dark:text-green-300',
          border: 'border-green-400 dark:border-green-800',
          label: 'Completed'
        },
        rejected: {
          icon: XCircle,
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-300',
          border: 'border-red-400 dark:border-red-800',
          label: 'Rejected'
        }
      };

      const config = statusConfig[status] || statusConfig.pending;
      const Icon = config.icon;

      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
          <Icon className="w-3.5 h-3.5" />
          {config.label}
        </span>
      );
    };

    return (
      <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Pending</p>
                <p className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">
                  {payouts.filter(p => p.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Activity className="w-5 h-5 text-blue-700 dark:text-blue-300" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Processing</p>
                <p className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">
                  {payouts.filter(p => p.status === 'processing').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-700 dark:text-green-300" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Completed</p>
                <p className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">
                  {payouts.filter(p => p.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-4">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-[#1f1f1f] rounded-lg">
                <Wallet className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc]">Total</p>
                <p className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">
                  {payoutsPagination.total}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Filter */}
        <div className="mb-6">
          <select
            value={payoutStatusFilter}
            onChange={(e) => setPayoutStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Payouts List */}
        {payoutsLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoaderSpinner size="lg" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#2E2E2E] rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-[#171717cc] dark:text-[#fafafacc]" />
            </div>
            <h3 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
              No Payout Requests
            </h3>
            <p className="text-[#171717cc] dark:text-[#fafafacc]">
              {payoutStatusFilter ? 'No payouts match the selected filter.' : 'No payout requests have been submitted yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payouts.map((payout) => (
              <div key={payout.payoutId} className="bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-[#2E2E2E] p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Wallet className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
                      <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
                        {formatCurrency(payout.totalAmount, payout.currency)}
                      </h3>
                      {getStatusBadge(payout.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">Seller</p>
                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                          {payout.sellerId?.name || payout.sellerId?.email || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">Requested</p>
                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                          {formatDateTime(payout.requestedAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">Payout Method</p>
                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa] capitalize">
                          {payout.payoutMethod?.replace('_', ' ') || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">Purchases</p>
                        <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa]">
                          {payout.purchaseIds?.length || 0} purchase(s)
                        </p>
                      </div>
                    </div>

                    {payout.payoutDetails && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-[#1f1f1f] rounded-lg">
                        <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-2">Payout Details</p>
                        {payout.payoutMethod === 'paypal' && payout.payoutDetails.paypalEmail && (
                          <p className="text-sm text-[#171717] dark:text-[#fafafa]">
                            PayPal: {payout.payoutDetails.paypalEmail}
                          </p>
                        )}
                        {(payout.payoutMethod === 'bank_transfer' || payout.payoutMethod === 'manual') && (
                          <div className="space-y-1">
                            {payout.payoutDetails.accountHolderName && (
                              <p className="text-sm text-[#171717] dark:text-[#fafafa]">
                                Account: {payout.payoutDetails.accountHolderName}
                              </p>
                            )}
                            {payout.payoutDetails.accountNumber && (
                              <p className="text-sm text-[#171717] dark:text-[#fafafa]">
                                Account #: {payout.payoutDetails.accountNumber}
                              </p>
                            )}
                            {payout.payoutDetails.bankName && (
                              <p className="text-sm text-[#171717] dark:text-[#fafafa]">
                                Bank: {payout.payoutDetails.bankName}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {payout.rejectionReason && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Rejection Reason</p>
                        <p className="text-sm text-red-600 dark:text-red-400">{payout.rejectionReason}</p>
                      </div>
                    )}

                    {payout.transactionId && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-[#171717cc] dark:text-[#fafafacc] mb-1">Transaction ID</p>
                        <p className="text-sm font-mono text-[#171717] dark:text-[#fafafa]">{payout.transactionId}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-6">
                    {payout.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handlePayoutApprove(payout.payoutId)}
                          disabled={actionLoading[payout.payoutId] === 'approving'}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading[payout.payoutId] === 'approving' ? (
                            <>
                              <LoaderSpinner size="sm" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Enter rejection reason (optional):');
                            if (reason !== null) {
                              handlePayoutReject(payout.payoutId, reason);
                            }
                          }}
                          disabled={actionLoading[payout.payoutId] === 'rejecting'}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading[payout.payoutId] === 'rejecting' ? (
                            <>
                              <LoaderSpinner size="sm" />
                              Rejecting...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4" />
                              Reject
                            </>
                          )}
                        </button>
                      </>
                    )}
                    {payout.status === 'processing' && (
                      <button
                        onClick={() => openTransactionModal(payout.payoutId)}
                        disabled={actionLoading[payout.payoutId] === 'completing'}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading[payout.payoutId] === 'completing' ? (
                          <>
                            <LoaderSpinner size="sm" />
                            Completing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Mark Complete
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {payoutsPagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => handlePayoutPageChange('prev')}
              disabled={payoutsPagination.page <= 1}
              className="px-3 py-1.5 text-xs border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-[#17171799] dark:text-[#fafafacc99]">
              Page {payoutsPagination.page} of {payoutsPagination.pages}
            </span>
            <button
              onClick={() => handlePayoutPageChange('next')}
              disabled={payoutsPagination.page >= payoutsPagination.pages}
              className="px-3 py-1.5 text-xs border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#171717] via-[#0f0f0f] to-[#050505] text-white p-8 shadow-2xl border border-white/10">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="relative space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Marketplace Ops</p>
              <h1 className="text-3xl font-bold">Marketplace Command</h1>
              <p className="text-sm text-white/70">
                Oversee premium submissions, payouts, and marketplace health from a single console.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs text-white/60">Pending Reviews</p>
                  <p className="text-3xl font-bold mt-1">{formatNumber(pendingReviewsCount)}</p>
                  <p className="text-xs text-emerald-300 mt-1">Content awaiting approval</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs text-white/60">Open Payouts</p>
                  <p className="text-3xl font-bold mt-1">{formatNumber(pendingPayoutsCount)}</p>
                  <p className="text-xs text-white/70 mt-1">Creator payouts in queue</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin')}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Admin
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-4 shadow"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.tone}`} />
                <div className="relative">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#17171766] dark:text-[#fafafa66]">
                    {stat.label}
                  </p>
                  <p className="text-xl font-semibold text-[#171717] dark:text-white mt-1">
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] p-6 shadow-lg space-y-4">
            <p className="text-sm font-semibold text-[#171717] dark:text-white">Quick Navigation</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'analytics'
                    ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717]'
                    : 'bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] text-[#171717cc] dark:text-[#fafafacc]'
                }`}
              >
                Analytics Dashboard
              </button>
              <button
                onClick={() => setActiveTab('moderation')}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'moderation'
                    ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717]'
                    : 'bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] text-[#171717cc] dark:text-[#fafafacc]'
                }`}
              >
                Review Queue
              </button>
              <button
                onClick={() => setActiveTab('payouts')}
                className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'payouts'
                    ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717]'
                    : 'bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] text-[#171717cc] dark:text-[#fafafacc]'
                }`}
              >
                Payout Requests
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            {success}
          </div>
        )}

        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'moderation' && renderModerationTab()}
        {activeTab === 'payouts' && renderPayoutsTab()}
      </div>

      {transactionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-2">
              Mark Payout as Completed
            </h3>
            <p className="text-sm text-[#17171799] dark:text-[#fafafacc99] mb-4">
              Optionally add a transaction/reference ID. Leave blank if not applicable.
            </p>
            <input
              type="text"
              value={transactionModal.transactionId}
              onChange={(e) => setTransactionModal(prev => ({ ...prev, transactionId: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] mb-4"
              placeholder="Transaction ID (optional)"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={closeTransactionModal}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2E2E2E] text-sm font-medium text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-50 dark:hover:bg-[#1f1f1f]"
              >
                Cancel
              </button>
              <button
                onClick={submitTransactionModal}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
              >
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminMarketplace;
