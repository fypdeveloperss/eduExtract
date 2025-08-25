const Purchase = require('../models/Purchase');
const MarketplaceContent = require('../models/MarketplaceContent');

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

      // Create purchase record
      const purchase = new Purchase({
        contentId,
        buyerId,
        sellerId: content.creatorId,
        amount,
        currency,
        paymentMethod,
        paymentStatus: paymentResult.status,
        transactionId: paymentResult.transactionId,
        status: 'active'
      });

      await purchase.save();

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
   * Process Stripe payment (placeholder for real integration)
   */
  async processStripePayment(paymentData) {
    // This would integrate with Stripe API in production
    // For now, we'll simulate a successful payment
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
        .populate('contentId', 'title description category subject')
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
}

module.exports = new PaymentService();
