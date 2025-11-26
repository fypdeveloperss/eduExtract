const mongoose = require('mongoose');

const sellerNotificationSchema = new mongoose.Schema({
  // Seller who receives the notification
  sellerId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  
  // Type of notification
  type: {
    type: String,
    required: true,
    enum: ['content_rejected', 'content_approved', 'content_flagged', 'sale', 'payout', 'review', 'system']
  },
  
  // Related content (if applicable)
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketplaceContent'
  },
  
  // Notification title
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  // Notification message
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Additional data (e.g., rejection reason, sale amount)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Read status
  isRead: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  readAt: {
    type: Date
  }
});

// Index for efficient queries
sellerNotificationSchema.index({ sellerId: 1, createdAt: -1 });
sellerNotificationSchema.index({ sellerId: 1, isRead: 1 });

// Static method to create a rejection notification
sellerNotificationSchema.statics.createRejectionNotification = async function(sellerId, contentId, contentTitle, reason) {
  return this.create({
    sellerId,
    type: 'content_rejected',
    contentId,
    title: 'Content Rejected',
    message: `Your content "${contentTitle}" has been rejected by an administrator.`,
    metadata: {
      rejectionReason: reason,
      contentTitle
    }
  });
};

// Static method to create an approval notification
sellerNotificationSchema.statics.createApprovalNotification = async function(sellerId, contentId, contentTitle) {
  return this.create({
    sellerId,
    type: 'content_approved',
    contentId,
    title: 'Content Approved',
    message: `Your content "${contentTitle}" has been approved and is now live on the marketplace.`,
    metadata: {
      contentTitle
    }
  });
};

// Static method to create a flag notification
sellerNotificationSchema.statics.createFlagNotification = async function(sellerId, contentId, contentTitle, flagCount) {
  return this.create({
    sellerId,
    type: 'content_flagged',
    contentId,
    title: 'Content Flagged',
    message: `Your content "${contentTitle}" has been flagged by users and is under review.`,
    metadata: {
      contentTitle,
      flagCount
    }
  });
};

module.exports = mongoose.model('SellerNotification', sellerNotificationSchema);
