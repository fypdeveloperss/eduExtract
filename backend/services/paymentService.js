const Purchase = require('../models/Purchase');
const MarketplaceContent = require('../models/MarketplaceContent');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
let stripeClient = null;
if (stripeSecret) {
  const Stripe = require('stripe');
  stripeClient = new Stripe(stripeSecret);
}

class PaymentService {
  constructor() {
    // In a real application, you would integrate with Stripe, PayPal, or other payment processors
    this.paymentProcessors = {
      stripe: this.processStripePayment.bind(this),
      paypal: this.processPayPalPayment.bind(this),
      manual: this.processManualPayment.bind(this)
    };
  }

  /**
   * Process a payment for content purchase
   */
  async processPayment(paymentData) {
    try {
      const { contentId, buyerId, paymentMethod, amount, currency } = paymentData;

      // Validate content exists and is for sale
      const content = await MarketplaceContent.findById(contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      if (content.price <= 0) {
        throw new Error('Content is free, no payment required');
      }

      if (content.status !== 'approved') {
        throw new Error('Content is not available for purchase');
      }

      // Check if user already purchased this content
      const existingPurchase = await Purchase.findOne({
        contentId,
        buyerId,
        status: 'active',
        paymentStatus: 'completed'
      });

      if (existingPurchase) {
        throw new Error('You already own this content');
      }

      // Process payment based on method
      const processor = this.paymentProcessors[paymentMethod] || this.paymentProcessors.manual;
      const paymentResult = await processor(paymentData);

      const purchase = await this.createPurchaseRecord({
        contentId,
        buyerId,
        sellerId: content.creatorId,
        amount,
        currency,
        paymentMethod,
        paymentStatus: paymentResult.status,
        transactionId: paymentResult.transactionId
      });

      return {
        success: true,
        purchaseId: purchase.purchaseId,
        paymentStatus: purchase.paymentStatus,
        transactionId: purchase.transactionId
      };

    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  /**
   * Calculate commission and seller earnings
   */
  calculateCommission(amount, commissionRate = 0.15) {
    const platformCommission = amount * commissionRate;
    const sellerEarnings = amount - platformCommission;
    return {
      platformCommission: Math.round(platformCommission * 100) / 100,
      sellerEarnings: Math.round(sellerEarnings * 100) / 100,
      commissionRate
    };
  }

  async createPurchaseRecord({
    contentId,
    buyerId,
    sellerId,
    amount,
    currency,
    paymentMethod,
    paymentStatus,
    transactionId,
    commissionRate = 0.15
  }) {
    // Calculate commission and seller earnings
    const { platformCommission, sellerEarnings } = this.calculateCommission(amount, commissionRate);
    
    const purchase = new Purchase({
      contentId,
      buyerId,
      sellerId,
      amount,
      currency,
      paymentMethod,
      paymentStatus,
      transactionId,
      platformCommission,
      commissionRate,
      sellerEarnings,
      payoutStatus: paymentStatus === 'completed' ? 'pending' : 'pending',
      status: 'active'
    });

    await purchase.save();
    return purchase;
  }

  async recordStripeCheckoutSession(session) {
    if (!session || session.payment_status !== 'paid') {
      throw new Error('Invalid Stripe session state');
    }

    const metadata = session.metadata || {};
    const { contentId, buyerId, sellerId } = metadata;

    if (!contentId || !buyerId || !sellerId) {
      throw new Error('Missing metadata for Stripe session');
    }

    // Extract payment intent ID - handle both expanded object and string ID
    const paymentIntentId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : session.payment_intent?.id || session.payment_intent;

    const existing = await Purchase.findOne({ transactionId: paymentIntentId });
    if (existing) {
      return existing;
    }

    const amount = session.amount_total / 100;
    const currency = session.currency?.toUpperCase() || 'USD';

    return this.createPurchaseRecord({
      contentId,
      buyerId,
      sellerId,
      amount,
      currency,
      paymentMethod: 'stripe',
      paymentStatus: 'completed',
      transactionId: paymentIntentId,
      commissionRate: 0.15 // 15% platform commission
    });
  }

  /**
   * Process Stripe payment (placeholder for real integration)
   */
  async processStripePayment(paymentData) {
    if (!stripeClient) {
      throw new Error('Stripe is not configured');
    }

    return {
      status: 'completed',
      transactionId: 'STRIPE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
  }

  /**
   * Process PayPal payment (placeholder for real integration)
   */
  async processPayPalPayment(paymentData) {
    // This would integrate with PayPal API in production
    return {
      status: 'completed',
      transactionId: 'PAYPAL_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
  }

  /**
   * Process manual payment (for testing/development)
   */
  async processManualPayment(paymentData) {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      status: 'completed',
      transactionId: 'MANUAL_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
  }

  /**
   * Check if user has access to content
   */
  async checkAccess(contentId, userId) {
    try {
      // Check if content is free
      const content = await MarketplaceContent.findById(contentId);
      if (!content) {
        return { hasAccess: false, reason: 'Content not found' };
      }

      if (content.price <= 0) {
        return { hasAccess: true, reason: 'Free content' };
      }

      // Check if user is the creator
      if (content.creatorId === userId) {
        return { hasAccess: true, reason: 'Content creator' };
      }

      // Check if user has purchased the content
      const purchase = await Purchase.findOne({
        contentId,
        buyerId: userId,
        status: 'active',
        paymentStatus: 'completed'
      });

      if (purchase) {
        // Check if access hasn't expired
        if (purchase.accessExpiresAt && purchase.accessExpiresAt < new Date()) {
          return { hasAccess: false, reason: 'Access expired' };
        }
        return { hasAccess: true, reason: 'Purchased content' };
      }

      return { hasAccess: false, reason: 'Payment required' };

    } catch (error) {
      console.error('Access check error:', error);
      return { hasAccess: false, reason: 'Error checking access' };
    }
  }

  /**
   * Get user's purchase history
   */
  async getUserPurchases(userId) {
    try {
      const purchases = await Purchase.find({ buyerId: userId })
        .populate('contentId', 'title description category subject contentType difficulty price currency views likes')
        .sort({ purchasedAt: -1 });

      return purchases;
    } catch (error) {
      console.error('Error fetching user purchases:', error);
      throw error;
    }
  }

  /**
   * Get content sales for a creator
   */
  async getCreatorSales(creatorId) {
    try {
      const sales = await Purchase.find({ sellerId: creatorId })
        .populate('contentId', 'title description category subject')
        .sort({ purchasedAt: -1 });

      return sales;
    } catch (error) {
      console.error('Error fetching creator sales:', error);
      throw error;
    }
  }

  getStripeClient() {
    return stripeClient;
  }

  /**
   * Get seller's pending earnings (unpaid)
   */
  async getPendingEarnings(sellerId) {
    try {
      const Purchase = require('../models/Purchase');
      const pendingPurchases = await Purchase.find({
        sellerId,
        paymentStatus: 'completed',
        payoutStatus: 'pending'
      });

      const totalPending = pendingPurchases.reduce((sum, purchase) => {
        return sum + (purchase.sellerEarnings || 0);
      }, 0);

      return {
        totalPending: Math.round(totalPending * 100) / 100,
        purchaseCount: pendingPurchases.length,
        purchases: pendingPurchases.map(p => ({
          purchaseId: p.purchaseId,
          amount: p.sellerEarnings,
          currency: p.currency,
          purchasedAt: p.purchasedAt
        }))
      };
    } catch (error) {
      console.error('Error getting pending earnings:', error);
      throw error;
    }
  }

  /**
   * Get seller's total earnings (all time)
   */
  async getTotalEarnings(sellerId) {
    try {
      const Purchase = require('../models/Purchase');
      const allPurchases = await Purchase.find({
        sellerId,
        paymentStatus: 'completed'
      });

      const totalEarnings = allPurchases.reduce((sum, purchase) => {
        return sum + (purchase.sellerEarnings || 0);
      }, 0);

      const paidEarnings = allPurchases
        .filter(p => p.payoutStatus === 'paid')
        .reduce((sum, purchase) => {
          return sum + (purchase.sellerEarnings || 0);
        }, 0);

      return {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        paidEarnings: Math.round(paidEarnings * 100) / 100,
        pendingEarnings: Math.round((totalEarnings - paidEarnings) * 100) / 100
      };
    } catch (error) {
      console.error('Error getting total earnings:', error);
      throw error;
    }
  }

  /**
   * Create payout request
   */
  async createPayoutRequest(sellerId, payoutData) {
    try {
      const Payout = require('../models/Payout');
      const Purchase = require('../models/Purchase');

      // Get pending earnings
      const pendingEarnings = await this.getPendingEarnings(sellerId);
      
      if (pendingEarnings.totalPending <= 0) {
        throw new Error('No pending earnings available for payout');
      }

      if (payoutData.amount > pendingEarnings.totalPending) {
        throw new Error('Requested amount exceeds pending earnings');
      }

      // Get purchase IDs for the payout
      const purchaseIds = pendingEarnings.purchases
        .slice(0, Math.ceil((payoutData.amount / pendingEarnings.totalPending) * pendingEarnings.purchaseCount))
        .map(p => p.purchaseId);

      const payout = new Payout({
        sellerId,
        totalAmount: payoutData.amount,
        currency: payoutData.currency || 'USD',
        payoutMethod: payoutData.payoutMethod || 'manual',
        payoutDetails: payoutData.payoutDetails || {},
        status: 'pending',
        purchaseIds
      });

      await payout.save();
      return payout;
    } catch (error) {
      console.error('Error creating payout request:', error);
      throw error;
    }
  }

  /**
   * Process payout (mark purchases as paid)
   */
  async processPayout(payoutId, adminId) {
    try {
      const Payout = require('../models/Payout');
      const Purchase = require('../models/Purchase');

      const payout = await Payout.findOne({ payoutId });
      if (!payout) {
        throw new Error('Payout not found');
      }

      if (payout.status !== 'pending') {
        throw new Error('Payout is not in pending status');
      }

      // Update payout status
      payout.status = 'processing';
      payout.approvedAt = new Date();
      payout.approvedBy = adminId;
      await payout.save();

      // Update purchase payout status
      await Purchase.updateMany(
        { purchaseId: { $in: payout.purchaseIds } },
        { 
          $set: { 
            payoutStatus: 'processing',
            payoutId: payout.payoutId
          }
        }
      );

      return payout;
    } catch (error) {
      console.error('Error processing payout:', error);
      throw error;
    }
  }

  /**
   * Complete payout (mark as paid)
   */
  async completePayout(payoutId, transactionId = null) {
    try {
      const Payout = require('../models/Payout');
      const Purchase = require('../models/Purchase');

      const payout = await Payout.findOne({ payoutId });
      if (!payout) {
        throw new Error('Payout not found');
      }

      if (payout.status !== 'processing') {
        throw new Error('Payout must be in processing status');
      }

      // Update payout status
      payout.status = 'completed';
      payout.completedAt = new Date();
      payout.processedAt = new Date();
      if (transactionId) {
        payout.transactionId = transactionId;
      }
      await payout.save();

      // Update purchase payout status
      await Purchase.updateMany(
        { purchaseId: { $in: payout.purchaseIds } },
        { 
          $set: { 
            payoutStatus: 'paid',
            payoutId: payout.payoutId
          }
        }
      );

      return payout;
    } catch (error) {
      console.error('Error completing payout:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
