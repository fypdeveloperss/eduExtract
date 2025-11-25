import { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { useCustomAlerts } from '../hooks/useCustomAlerts';
import api from '../utils/axios';
import LoaderSpinner from '../components/LoaderSpinner';
import { 
  DollarSign, 
  Package, 
  TrendingUp, 
  ShoppingCart, 
  CheckCircle, 
  Clock,
  LineChart,
  FileText,
  Eye,
  Heart,
  Calendar,
  Edit,
  Wallet,
  CreditCard,
  X,
  Plus
} from 'lucide-react';

function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { warning } = useCustomAlerts();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [analytics, setAnalytics] = useState({
    metrics: {
      totalProducts: 0,
      approvedProducts: 0,
      pendingProducts: 0,
      totalRevenue: 0,
      revenue30d: 0,
      totalEarnings: 0,
      earnings30d: 0,
      totalCommission: 0,
      totalSales: 0,
      sales30d: 0,
      pendingEarnings: 0,
      paidEarnings: 0
    },
    earnings: {},
    pendingEarnings: {},
    products: [],
    topProducts: [],
    salesTrend: [],
    recentSales: []
  });

  useEffect(() => {
    if (user) {
      fetchAnalytics();
      if (activeTab === 'payouts') {
        fetchPayoutHistory();
      }
    }
  }, [user, activeTab]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/marketplace/seller/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch seller analytics:', error);
      setError('Failed to load your seller analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutHistory = async () => {
    try {
      setPayoutLoading(true);
      const response = await api.get('/api/marketplace/payouts/history');
      setPayoutHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch payout history:', error);
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      setError('');
      setSuccess('');
      const formData = new FormData();
      
      Object.keys(updatedData).forEach(key => {
        if (key === 'tags' && Array.isArray(updatedData[key])) {
          formData.append(key, JSON.stringify(updatedData[key]));
        } else if (key !== 'file') {
          formData.append(key, updatedData[key]);
        }
      });
      
      if (updatedData.file) {
        formData.append('document', updatedData.file);
      }

      await api.put(`/api/marketplace/content/${editingProduct._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSuccess('Product updated successfully!');
      setShowEditModal(false);
      setEditingProduct(null);
      fetchAnalytics();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to update product:', error);
      setError(error.response?.data?.error || 'Failed to update product');
    }
  };

  const handleRequestPayout = async (payoutData) => {
    try {
      setError('');
      setSuccess('');
      const response = await api.post('/api/marketplace/payouts/request', payoutData);
      setSuccess('Payout request submitted successfully!');
      setShowPayoutModal(false);
      fetchAnalytics();
      fetchPayoutHistory();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to request payout:', error);
      setError(error.response?.data?.error || 'Failed to request payout');
    }
  };

  const formatCurrency = (value, currency = 'USD') => {
    const amount = Number(value) || 0;
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    const symbol = symbols[currency] || '$';
    return `${symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      approved: {
        className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
        icon: CheckCircle,
        label: 'Approved'
      },
      pending: {
        className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        icon: Clock,
        label: 'Pending'
      },
      rejected: {
        className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
        icon: Clock,
        label: 'Rejected'
      },
      processing: {
        className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        icon: Clock,
        label: 'Processing'
      },
      completed: {
        className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
        icon: CheckCircle,
        label: 'Completed'
      },
      cancelled: {
        className: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800',
        icon: X,
        label: 'Cancelled'
      }
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#2E2E2E] rounded-lg shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 border border-gray-200 dark:border-[#2E2E2E] bg-gray-100 dark:bg-[#1f1f1f] rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">Sign In Required</h1>
          <p className="text-sm text-[#171717cc] dark:text-[#fafafacc]">Please sign in to view your seller dashboard.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full px-6 py-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-semibold"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center px-4">
        <div className="flex flex-col items-center space-y-3 text-center text-[#171717cc] dark:text-[#fafafacc]">
          <LoaderSpinner size="xl" />
          <p>Loading your seller dashboard...</p>
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      title: 'Total Earnings',
      value: formatCurrency(analytics.metrics.totalEarnings || 0),
      description: `Pending: ${formatCurrency(analytics.metrics.pendingEarnings || 0)}`,
      icon: Wallet,
      accent: 'bg-emerald-100 dark:bg-emerald-900/30'
    },
    {
      title: 'Earnings (30d)',
      value: formatCurrency(analytics.metrics.earnings30d || 0),
      description: 'Last 30 days',
      icon: TrendingUp,
      accent: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      title: 'Platform Commission',
      value: formatCurrency(analytics.metrics.totalCommission || 0),
      description: '15% of total revenue',
      icon: CreditCard,
      accent: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      title: 'Total Sales',
      value: analytics.metrics.totalSales,
      description: `${analytics.metrics.sales30d} in last 30 days`,
      icon: ShoppingCart,
      accent: 'bg-orange-100 dark:bg-orange-900/30'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-2">
          Seller Dashboard
        </h1>
        <p className="text-[#171717cc] dark:text-[#fafafacc]">
          Manage your products, track sales, and view revenue
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 mb-6 border-b border-[#fafafa1a]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] border-b-2 border-[#171717] dark:border-[#fafafa]'
              : 'text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-100 dark:hover:bg-[#1f1f1f]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
            activeTab === 'products'
              ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] border-b-2 border-[#171717] dark:border-[#fafafa]'
              : 'text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-100 dark:hover:bg-[#1f1f1f]'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
            activeTab === 'payouts'
              ? 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] border-b-2 border-[#171717] dark:border-[#fafafa]'
              : 'text-[#171717cc] dark:text-[#fafafacc] hover:bg-gray-100 dark:hover:bg-[#1f1f1f]'
          }`}
        >
          Payouts
        </button>
      </div>

      {activeTab === 'overview' && (
        <>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {metricCards.map((card) => (
          <div
            key={card.title}
            className="bg-white dark:bg-[#171717] rounded-xl border border-[#fafafa1a] p-5 flex items-center gap-4 shadow-sm"
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

      {/* Sales Trend & Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Sales Trend */}
        <div className="bg-white dark:bg-[#171717] border border-[#fafafa1a] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#17171799] dark:text-[#fafafacc99]">
                Sales Trend (30d)
              </p>
              <p className="text-xl font-semibold text-[#171717] dark:text-[#fafafa]">
                {formatCurrency(analytics.metrics.revenue30d)} revenue
              </p>
            </div>
            <LineChart className="w-6 h-6 text-[#171717cc] dark:text-[#fafafacc]" />
          </div>
          {analytics.salesTrend.length === 0 ? (
            <p className="text-sm text-[#17171799] dark:text-[#fafafacc99]">No sales in the last 30 days.</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {analytics.salesTrend.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between text-sm text-[#171717cc] dark:text-[#fafafacc]"
                >
                  <span>{formatDate(day.date)}</span>
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

        {/* Top Products */}
        <div className="bg-white dark:bg-[#171717] border border-[#fafafa1a] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">Top Products</p>
            <Package className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
          </div>
          {analytics.topProducts.length === 0 ? (
            <p className="text-sm text-[#17171799] dark:text-[#fafafacc99]">No sales yet.</p>
          ) : (
            <div className="space-y-3">
              {analytics.topProducts.map((product, index) => (
                <div key={product.productId} className="border border-[#fafafa1a] rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm text-[#171717cc] dark:text-[#fafafacc]">
                    <span className="font-semibold">#{index + 1} {product.title}</span>
                    <span>{formatCurrency(product.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#17171799] dark:text-[#fafafacc99] mt-1">
                    <span>{product.sales} sales</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white dark:bg-[#171717] border border-[#fafafa1a] rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">Recent Sales</p>
          <ShoppingCart className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
        </div>
        {analytics.recentSales.length === 0 ? (
          <p className="text-sm text-[#17171799] dark:text-[#fafafacc99]">No sales yet.</p>
        ) : (
          <div className="space-y-3">
            {analytics.recentSales.map((sale) => (
              <div key={sale.purchaseId} className="border border-[#fafafa1a] rounded-lg p-3">
                <div className="flex items-center justify-between text-sm text-[#171717cc] dark:text-[#fafafacc]">
                  <div className="flex-1">
                    <span className="font-semibold">{sale.productTitle}</span>
                    <span className="text-[#17171799] dark:text-[#fafafacc99] ml-2">
                      sold to {sale.buyerName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{formatCurrency(sale.amount, sale.currency)}</span>
                    <span className="text-xs text-[#17171799] dark:text-[#fafafacc99]">
                      {formatDateTime(sale.purchasedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {activeTab === 'products' && (
        <div className="bg-white dark:bg-[#171717] border border-[#fafafa1a] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">Your Products</p>
            <button
              onClick={() => navigate('/marketplace')}
              className="px-4 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
          {analytics.products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-[#171717cc] dark:text-[#fafafacc] mx-auto mb-4" />
              <p className="text-[#171717cc] dark:text-[#fafafacc] mb-4">You haven't published any products yet.</p>
              <button
                onClick={() => navigate('/marketplace')}
                className="px-6 py-3 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-semibold"
              >
                Publish Your First Product
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.products.map((product) => (
                <div
                  key={product._id}
                  className="border border-[#fafafa1a] rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1" onClick={() => navigate(`/marketplace/content/${product._id}`)}>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">
                          {product.title}
                        </h3>
                        {getStatusBadge(product.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#17171799] dark:text-[#fafafacc99] mb-2">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {product.views || 0} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {product.likes || 0} likes
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="w-4 h-4" />
                          {product.totalSales || 0} sales
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {formatCurrency(product.totalRevenue || 0, product.currency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#17171799] dark:text-[#fafafacc99]">
                        <span className="capitalize">{product.category}</span>
                        <span>•</span>
                        <span className="capitalize">{product.contentType}</span>
                        <span>•</span>
                        <span>{formatCurrency(product.price, product.currency)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(product.createdAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProduct(product);
                      }}
                      className="ml-4 px-3 py-2 border border-[#fafafa1a] bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="space-y-6">
          {/* Earnings Summary */}
          <div className="bg-white dark:bg-[#171717] border border-[#fafafa1a] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-semibold text-[#171717] dark:text-[#fafafa]">Earnings Summary</p>
              <button
                onClick={() => setShowPayoutModal(true)}
                disabled={!analytics.metrics.pendingEarnings || analytics.metrics.pendingEarnings <= 0}
                className="px-4 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Request Payout
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-[#fafafa1a] rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide text-[#17171799] dark:text-[#fafafacc99] mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">
                  {formatCurrency(analytics.metrics.totalEarnings || 0)}
                </p>
              </div>
              <div className="border border-[#fafafa1a] rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide text-[#17171799] dark:text-[#fafafacc99] mb-1">Pending</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(analytics.metrics.pendingEarnings || 0)}
                </p>
              </div>
              <div className="border border-[#fafafa1a] rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide text-[#17171799] dark:text-[#fafafacc99] mb-1">Paid Out</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(analytics.metrics.paidEarnings || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Payout History */}
          <div className="bg-white dark:bg-[#171717] border border-[#fafafa1a] rounded-2xl p-6 shadow-sm">
            <p className="text-lg font-semibold text-[#171717] dark:text-[#fafafa] mb-4">Payout History</p>
            {payoutLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoaderSpinner size="lg" />
              </div>
            ) : payoutHistory.length === 0 ? (
              <p className="text-sm text-[#17171799] dark:text-[#fafafacc99]">No payout requests yet.</p>
            ) : (
              <div className="space-y-3">
                {payoutHistory.map((payout) => (
                  <div key={payout.payoutId} className="border border-[#fafafa1a] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#171717] dark:text-[#fafafa]">
                          {formatCurrency(payout.totalAmount, payout.currency)}
                        </p>
                        <p className="text-sm text-[#17171799] dark:text-[#fafafacc99]">
                          {formatDateTime(payout.requestedAt)} • {payout.purchaseIds?.length || 0} purchases
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(payout.status)}
                        {payout.status === 'pending' && (
                          <span className="text-xs text-[#17171799] dark:text-[#fafafacc99]">
                            Awaiting approval
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => {
            setShowEditModal(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveEdit}
        />
      )}

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <PayoutRequestModal
          pendingEarnings={analytics.metrics.pendingEarnings || 0}
          onClose={() => setShowPayoutModal(false)}
          onRequest={handleRequestPayout}
        />
      )}
    </div>
  );
}

// Edit Product Modal Component
function EditProductModal({ product, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: product.title || '',
    description: product.description || '',
    category: product.category || '',
    subject: product.subject || '',
    difficulty: product.difficulty || '',
    tags: product.tags || [],
    price: product.price || 0,
    currency: product.currency || 'USD',
    file: null
  });
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && formData.tags.length < 5) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim().toLowerCase()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#171717] rounded-2xl mt-10 shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-[#fafafa1a]">
        <div className="flex items-center justify-between p-6 border-b border-[#fafafa1a]">
          <h2 className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">Edit Product</h2>
          <button
            onClick={onClose}
            className="text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                required
              >
                <option value="mathematics">Mathematics</option>
                <option value="science">Science</option>
                <option value="history">History</option>
                <option value="literature">Literature</option>
                <option value="languages">Languages</option>
                <option value="arts">Arts</option>
                <option value="technology">Technology</option>
                <option value="business">Business</option>
                <option value="health">Health</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                required
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag (max 5)"
                className="flex-1 px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                disabled={formData.tags.length >= 5}
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={formData.tags.length >= 5 || !tagInput.trim()}
                className="px-4 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 dark:bg-[#1f1f1f] text-[#171717] dark:text-[#fafafa] rounded-full text-sm flex items-center gap-2"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Update File (Optional)</label>
            <input
              type="file"
              onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
              accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
              className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-[#fafafa1a]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#fafafa1a] rounded-lg text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-semibold"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Payout Request Modal Component
function PayoutRequestModal({ pendingEarnings, onClose, onRequest }) {
  const [formData, setFormData] = useState({
    amount: pendingEarnings,
    currency: 'USD',
    payoutMethod: 'manual',
    payoutDetails: {
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      paypalEmail: ''
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.amount > pendingEarnings) {
      warning('Amount cannot exceed pending earnings', 'Invalid Amount');
      return;
    }
    onRequest(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#171717] rounded-2xl shadow-2xl w-full max-w-md border border-[#fafafa1a]">
        <div className="flex items-center justify-between p-6 border-b border-[#fafafa1a]">
          <h2 className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">Request Payout</h2>
          <button
            onClick={onClose}
            className="text-[#171717cc] dark:text-[#fafafacc] hover:text-[#171717] dark:hover:text-[#fafafa]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={pendingEarnings}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
              required
            />
            <p className="text-xs text-[#17171799] dark:text-[#fafafacc99] mt-1">
              Available: {pendingEarnings.toFixed(2)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Payout Method</label>
            <select
              value={formData.payoutMethod}
              onChange={(e) => setFormData({ ...formData, payoutMethod: e.target.value })}
              className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
            >
              <option value="manual">Manual Transfer</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="stripe_connect">Stripe Connect</option>
            </select>
          </div>
          {formData.payoutMethod === 'paypal' && (
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">PayPal Email</label>
              <input
                type="email"
                value={formData.payoutDetails.paypalEmail}
                onChange={(e) => setFormData({
                  ...formData,
                  payoutDetails: { ...formData.payoutDetails, paypalEmail: e.target.value }
                })}
                className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                required
              />
            </div>
          )}
          {(formData.payoutMethod === 'bank_transfer' || formData.payoutMethod === 'manual') && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={formData.payoutDetails.accountHolderName}
                  onChange={(e) => setFormData({
                    ...formData,
                    payoutDetails: { ...formData.payoutDetails, accountHolderName: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.payoutDetails.accountNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    payoutDetails: { ...formData.payoutDetails, accountNumber: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-[#fafafa] mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.payoutDetails.bankName}
                  onChange={(e) => setFormData({
                    ...formData,
                    payoutDetails: { ...formData.payoutDetails, bankName: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa]"
                  required
                />
              </div>
            </>
          )}
          <div className="flex gap-3 pt-4 border-t border-[#fafafa1a]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#fafafa1a] rounded-lg text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-semibold"
            >
              Request Payout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SellerDashboard;

