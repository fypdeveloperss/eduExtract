const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth');
const { verifyAdmin } = require('../config/firebase-admin');

// Import our models
const MarketplaceContent = require('../models/MarketplaceContent');
const UserStats = require('../models/UserStats');
const ContentReview = require('../models/ContentReview');
const User = require('../models/User');

// Import services (we'll create these next)
const PlagiarismService = require('../services/plagiarismService');
const PaymentService = require('../services/paymentService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/marketplace');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow PDF, DOC, DOCX, TXT, and other common document formats
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, PPT, PPTX, and image files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * @route   POST /api/marketplace/upload
 * @desc    Upload content to marketplace
 * @access  Private
 */
router.post('/upload', verifyToken, upload.single('document'), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subject,
      difficulty,
      tags,
      contentType,
      contentData,
      price = 0,
      contentId = null, // Optional: reference to generated content
      isPersonal = false
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !subject || !difficulty || !contentType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['title', 'description', 'category', 'subject', 'difficulty', 'contentType']
      });
    }

    // Validate category and difficulty
    const validCategories = ['mathematics', 'science', 'history', 'literature', 'languages', 'arts', 'technology', 'business', 'health', 'other'];
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    const validContentTypes = ['blog', 'slides', 'flashcards', 'quiz', 'summary', 'personal', 'document'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty level' });
    }
    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // Check if user already has a pending content with the same title
    const existingContent = await MarketplaceContent.findOne({
      creatorId: req.user.uid,
      title: title,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingContent) {
      return res.status(400).json({ error: 'You already have content with this title' });
    }

    // Handle file upload
    let fileData = null;
    let filePath = null;
    
    if (req.file) {
      filePath = req.file.path;
      fileData = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      };
    }

    // Create new marketplace content
    const newContent = new MarketplaceContent({
      contentId,
      creatorId: req.user.uid,
      title: title.trim(),
      description: description.trim(),
      category,
      subject: subject.trim(),
      difficulty,
      tags: tags || [],
      contentType,
      isPersonal,
      contentData: fileData || contentData,
      filePath: filePath,
      price: Math.max(0, price),
      status: 'pending' // Will be approved after plagiarism check
    });

    // Save the content
    await newContent.save();

    // Update user stats
    await updateUserStats(req.user.uid, 'upload');

    // Run plagiarism check (skip for documents as we can't extract text easily)
    try {
      if (contentType === 'document') {
        // For documents, skip plagiarism check and auto-approve
        console.log('Skipping plagiarism check for document upload');
        newContent.plagiarismScore = 100; // Assume original for documents
        newContent.plagiarismReport = {
          overallScore: 100,
          riskLevel: 'low',
          checks: [],
          sources: [],
          recommendations: ['Document upload - plagiarism check skipped'],
          timestamp: new Date(),
          confidence: 0
        };
        newContent.status = 'approved';
        await newContent.save();
      } else {
        // For text-based content, run plagiarism check
        const plagiarismResult = await PlagiarismService.checkPlagiarism(
          contentData, 
          contentType
        );
        newContent.plagiarismScore = plagiarismResult.score;
        newContent.plagiarismReport = plagiarismResult.report;
        
        // Auto-approve if plagiarism score is good
        if (plagiarismResult.score < 30) {
          newContent.status = 'approved';
          await newContent.save();
        }
      }
    } catch (error) {
      console.error('Plagiarism check failed:', error);
      // Continue with pending status
    }

    res.status(201).json({
      message: 'Content uploaded successfully',
      contentId: newContent._id,
      status: newContent.status,
      plagiarismScore: newContent.plagiarismScore
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to upload content',
      details: error.message 
    });
  }
});

/**
 * @route   GET /api/marketplace/content
 * @desc    Browse marketplace content with filters
 * @access  Public
 */
router.get('/content', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      subject,
      difficulty,
      contentType,
      status = 'approved',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build filter object
    const filter = { status };
    
    if (category) filter.category = category;
    if (subject) filter.subject = { $regex: subject, $options: 'i' };
    if (difficulty) filter.difficulty = difficulty;
    if (contentType) filter.contentType = contentType;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const content = await MarketplaceContent.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await MarketplaceContent.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      content,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        hasNext,
        hasPrev,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Browse error:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

/**
 * @route   GET /api/marketplace/content/:id/download
 * @desc    Download content file (requires purchase or free access)
 * @access  Private
 */
router.get('/content/:id/download', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    // Check if user has access to this content
    const accessInfo = await PaymentService.checkAccess(id, userId);
    if (!accessInfo.hasAccess) {
      return res.status(403).json({ error: 'Access denied. Please purchase this content first.' });
    }

    // Get content details
    const content = await MarketplaceContent.findById(id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if content has a file
    if (!content.filePath) {
      return res.status(400).json({ error: 'This content does not have a downloadable file' });
    }

    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(content.filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set appropriate headers for download
    const fileName = content.contentData?.originalName || `content-${id}`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Set content type based on file type
    if (content.contentData?.mimetype) {
      res.setHeader('Content-Type', content.contentData.mimetype);
    }

    // Stream the file
    const fileStream = fs.createReadStream(content.filePath);
    fileStream.pipe(res);

    // Increment download count
    await MarketplaceContent.findByIdAndUpdate(id, { $inc: { downloads: 1 } });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download content' });
  }
});

/**
 * @route   GET /api/marketplace/content/:id/preview
 * @desc    Get content preview (free for everyone)
 * @access  Public
 */
router.get('/content/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;
    const content = await MarketplaceContent.findById(id).lean();

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Return only preview information
    const preview = {
      _id: content._id,
      title: content.title,
      description: content.description,
      category: content.category,
      subject: content.subject,
      difficulty: content.difficulty,
      tags: content.tags,
      contentType: content.contentType,
      price: content.price,
      currency: content.currency,
      creatorId: content.creatorId,
      views: content.views,
      likes: content.likes,
      createdAt: content.createdAt,
      previewContent: content.previewContent || generatePreview(content.contentData, content.contentType)
    };

    res.json(preview);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Failed to get preview' });
  }
});

// Helper function to generate preview content
function generatePreview(contentData, contentType) {
  if (contentType === 'blog' || contentType === 'summary') {
    // Return first 200 characters for text content
    const text = typeof contentData === 'string' ? contentData : JSON.stringify(contentData);
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
  } else if (contentType === 'slides') {
    // Return first few slides
    const slides = Array.isArray(contentData) ? contentData : [];
    return slides.slice(0, 3);
  } else if (contentType === 'flashcards') {
    // Return first few flashcards
    const cards = Array.isArray(contentData) ? contentData : [];
    return cards.slice(0, 2);
  } else if (contentType === 'quiz') {
    // Return quiz structure without answers
    const quiz = typeof contentData === 'object' ? contentData : {};
    return {
      title: quiz.title,
      description: quiz.description,
      questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0
    };
  }
  
  return 'Preview not available';
}

/**
 * @route   GET /api/marketplace/content/:id
 * @desc    Get specific marketplace content
 * @access  Public
 */
router.get('/content/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find content and populate creator info
    const content = await MarketplaceContent.findById(id).lean();

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Increment view count
    await MarketplaceContent.findByIdAndUpdate(id, { $inc: { views: 1 } });

    // Get reviews for this content with reviewer info
    const reviews = await ContentReview.find({ 
      contentId: id, 
      status: 'active' 
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    // Calculate average rating
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    // Populate reviewer names
    const reviewsWithNames = await Promise.all(
      reviews.map(async (review) => {
        const reviewer = await User.findOne({ uid: review.reviewerId })
          .select('name')
          .lean();
        return {
          ...review,
          reviewerName: reviewer?.name || 'Anonymous User'
        };
      })
    );

    // Get creator info and stats (creatorId stores Firebase UID string)
    const creator = await User.findOne({ uid: content.creatorId })
      .select('name email uid')
      .lean();
    const creatorStats = await UserStats.findOne({ userId: content.creatorId })
      .select('reputationLevel badges totalUploads')
      .lean();

    res.json({
      content: {
        ...content,
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: reviews.length
      },
      reviews: reviewsWithNames,
      creator,
      creatorStats
    });

  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

/**
 * @route   POST /api/marketplace/content/:id/like
 * @desc    Like/unlike content
 * @access  Private
 */
router.post('/content/:id/like', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const content = await MarketplaceContent.findById(id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const isLiked = content.likedBy.includes(userId);

    if (isLiked) {
      // Unlike
      content.likedBy = content.likedBy.filter(id => id !== userId);
      content.likes = Math.max(0, content.likes - 1);
    } else {
      // Like
      content.likedBy.push(userId);
      content.likes += 1;
    }

    await content.save();

    // Update user stats
    await updateUserStats(content.creatorId, 'like', isLiked ? -1 : 1);

    res.json({
      message: isLiked ? 'Content unliked' : 'Content liked',
      likes: content.likes,
      isLiked: !isLiked
    });

  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Failed to update like status' });
  }
});

/**
 * @route   POST /api/marketplace/content/:id/review
 * @desc    Add/update review for content
 * @access  Private
 */
router.post('/content/:id/review', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review, categories } = req.body;
    const userId = req.user.uid;

    // Validate input
    if (!rating || !review || !categories) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['rating', 'review', 'categories']
      });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: 'Rating must be a whole number between 1 and 5' });
    }

    if (review.length < 10 || review.length > 1000) {
      return res.status(400).json({ error: 'Review must be between 10 and 1000 characters' });
    }

    // Check if content exists
    const content = await MarketplaceContent.findById(id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if user has access to this content (must have purchased or it's free)
    const accessInfo = await PaymentService.checkAccess(id, userId);
    if (!accessInfo.hasAccess) {
      return res.status(403).json({ error: 'You must have access to this content to leave a review' });
    }

    // Check if user already reviewed this content
    let existingReview = await ContentReview.findOne({
      contentId: id,
      reviewerId: userId
    });

    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.review = review;
      existingReview.categories = categories;
      existingReview.updatedAt = new Date();
      await existingReview.save();
    } else {
      // Create new review
      existingReview = new ContentReview({
        contentId: id,
        reviewerId: userId,
        rating,
        review,
        categories
      });
      await existingReview.save();
    }

    // Update content average rating
    await updateContentRating(id);

    res.json({
      message: 'Review submitted successfully',
      review: existingReview
    });

  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

/**
 * @route   GET /api/marketplace/categories
 * @desc    Get available categories and subjects
 * @access  Public
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      'mathematics', 'science', 'history', 'literature', 
      'languages', 'arts', 'technology', 'business', 'health', 'other'
    ];

    const difficulties = ['beginner', 'intermediate', 'advanced'];
    
    const contentTypes = ['blog', 'slides', 'flashcards', 'quiz', 'summary', 'personal', 'document'];

    // Get unique subjects for each category
    const categorySubjects = {};
    for (const category of categories) {
      const subjects = await MarketplaceContent.distinct('subject', { 
        category, 
        status: 'approved' 
      });
      categorySubjects[category] = subjects;
    }

    res.json({
      categories,
      difficulties,
      contentTypes,
      categorySubjects
    });

  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * @route   GET /api/marketplace/search
 * @desc    Search marketplace content
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q, category, difficulty, contentType, page = 1, limit = 12 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Build search query
    const searchQuery = {
      status: 'approved',
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
        { subject: { $regex: q, $options: 'i' } }
      ]
    };

    // Add filters
    if (category) searchQuery.category = category;
    if (difficulty) searchQuery.difficulty = difficulty;
    if (contentType) searchQuery.contentType = contentType;

    // Execute search
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const results = await MarketplaceContent.find(searchQuery)
      .sort({ views: -1, likes: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await MarketplaceContent.countDocuments(searchQuery);

    res.json({
      results,
      query: q,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * @route   POST /api/marketplace/purchase
 * @desc    Purchase content
 * @access  Private
 */
router.post('/purchase', verifyToken, async (req, res) => {
  try {
    const { contentId, paymentMethod, amount, currency = 'USD' } = req.body;

    if (!contentId || !paymentMethod || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['contentId', 'paymentMethod', 'amount']
      });
    }

    // Validate payment method
    const validPaymentMethods = ['credit_card', 'debit_card', 'paypal', 'stripe', 'manual'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const paymentData = {
      contentId,
      buyerId: req.user.uid,
      paymentMethod,
      amount: parseFloat(amount),
      currency
    };

    const result = await PaymentService.processPayment(paymentData);

    res.json({
      success: true,
      message: 'Payment processed successfully',
      ...result
    });

  } catch (error) {
    console.error('Purchase error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route   POST /api/marketplace/checkout/session
 * @desc    Create Stripe Checkout session for marketplace purchase
 * @access  Private
 */
router.post('/checkout/session', verifyToken, async (req, res) => {
  try {
    const PaymentService = require('../services/paymentService');
    const stripe = PaymentService.getStripeClient();
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe is not configured' });
    }

    const { contentId, successUrl, cancelUrl } = req.body;
    if (!contentId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'contentId, successUrl and cancelUrl are required' });
    }

    const MarketplaceContent = require('../models/MarketplaceContent');
    const content = await MarketplaceContent.findById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    if (content.status !== 'approved') {
      return res.status(400).json({ error: 'Content is not available for purchase' });
    }
    if (content.price <= 0) {
      return res.status(400).json({ error: 'Content is free, no checkout required' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: req.user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: (content.currency || 'USD').toLowerCase(),
            unit_amount: Math.round(content.price * 100),
            product_data: {
              name: content.title,
              description: content.description?.slice(0, 200),
              metadata: {
                contentId: content._id.toString()
              }
            }
          },
          quantity: 1
        }
      ],
      metadata: {
        contentId: content._id.toString(),
        buyerId: req.user.uid,
        sellerId: content.creatorId
      },
      success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * @route   POST /api/marketplace/checkout/confirm
 * @desc    Confirm Stripe Checkout session and record purchase
 * @access  Private
 */
router.post('/checkout/confirm', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const PaymentService = require('../services/paymentService');
    const stripe = PaymentService.getStripeClient();
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe is not configured' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });

    if (!session || session.metadata?.buyerId !== req.user.uid) {
      return res.status(403).json({ error: 'You are not authorized to confirm this session' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed yet' });
    }

    const purchase = await PaymentService.recordStripeCheckoutSession(session);
    res.json({
      success: true,
      purchaseId: purchase.purchaseId,
      transactionId: purchase.transactionId
    });
  } catch (error) {
    console.error('Checkout confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm checkout session' });
  }
});

/**
 * @route   GET /api/marketplace/content/:id/access
 * @desc    Check if user has access to content
 * @access  Private
 */
router.get('/content/:id/access', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const accessInfo = await PaymentService.checkAccess(id, req.user.uid);

    res.json(accessInfo);
  } catch (error) {
    console.error('Access check error:', error);
    res.status(500).json({ error: 'Failed to check access' });
  }
});

/**
 * @route   GET /api/marketplace/purchases
 * @desc    Get user's purchase history
 * @access  Private
 */
router.get('/purchases', verifyToken, async (req, res) => {
  try {
    const purchases = await PaymentService.getUserPurchases(req.user.uid);
    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

/**
 * @route   GET /api/marketplace/sales
 * @desc    Get creator's sales history
 * @access  Private
 */
router.get('/sales', verifyToken, async (req, res) => {
  try {
    const sales = await PaymentService.getCreatorSales(req.user.uid);
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

/**
 * @route   GET /api/marketplace/seller/analytics
 * @desc    Get seller's analytics (revenue, sales, products)
 * @access  Private
 */
router.get('/seller/analytics', verifyToken, async (req, res) => {
  try {
    const sellerId = req.user.uid;
    const Purchase = require('../models/Purchase');
    const User = require('../models/User');

    // Get all products by this seller
    const products = await MarketplaceContent.find({ creatorId: sellerId })
      .select('_id title price currency status views likes createdAt category contentType')
      .sort({ createdAt: -1 });

    // Get all sales for this seller
    const allSales = await Purchase.find({ 
      sellerId,
      paymentStatus: 'completed'
    }).populate('contentId', 'title category contentType');
    
    // Get buyer info for each sale
    const buyerIds = [...new Set(allSales.map(sale => sale.buyerId))];
    const buyers = await User.find({ uid: { $in: buyerIds } }).select('uid name email');
    const buyerMap = {};
    buyers.forEach(buyer => {
      buyerMap[buyer.uid] = buyer;
    });

    // Calculate metrics
    const totalRevenue = allSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const totalEarnings = allSales.reduce((sum, sale) => sum + (sale.sellerEarnings || 0), 0);
    const totalCommission = allSales.reduce((sum, sale) => sum + (sale.platformCommission || 0), 0);
    
    // Revenue in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSales = allSales.filter(sale => new Date(sale.purchasedAt) >= thirtyDaysAgo);
    const revenue30d = recentSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const earnings30d = recentSales.reduce((sum, sale) => sum + (sale.sellerEarnings || 0), 0);
    
    // Get earnings summary
    const earningsSummary = await PaymentService.getTotalEarnings(sellerId);
    const pendingEarnings = await PaymentService.getPendingEarnings(sellerId);

    // Sales by product
    const salesByProduct = {};
    allSales.forEach(sale => {
      const productId = sale.contentId?._id?.toString() || 'unknown';
      if (!salesByProduct[productId]) {
        salesByProduct[productId] = {
          productId,
          title: sale.contentId?.title || 'Unknown',
          sales: 0,
          revenue: 0
        };
      }
      salesByProduct[productId].sales += 1;
      salesByProduct[productId].revenue += sale.amount || 0;
    });

    // Daily sales trend (last 30 days)
    const dailyTrend = {};
    recentSales.forEach(sale => {
      const date = new Date(sale.purchasedAt).toISOString().split('T')[0];
      if (!dailyTrend[date]) {
        dailyTrend[date] = { date, revenue: 0, orders: 0 };
      }
      dailyTrend[date].revenue += sale.amount || 0;
      dailyTrend[date].orders += 1;
    });

    // Product stats
    const productStats = products.map(product => {
      const productSales = allSales.filter(sale => 
        sale.contentId?._id?.toString() === product._id.toString()
      );
      return {
        ...product.toObject(),
        totalSales: productSales.length,
        totalRevenue: productSales.reduce((sum, sale) => sum + (sale.amount || 0), 0)
      };
    });

    res.json({
      metrics: {
        totalProducts: products.length,
        approvedProducts: products.filter(p => p.status === 'approved').length,
        pendingProducts: products.filter(p => p.status === 'pending').length,
        totalRevenue,
        revenue30d,
        totalEarnings,
        earnings30d,
        totalCommission,
        totalSales: allSales.length,
        sales30d: recentSales.length,
        pendingEarnings: earningsSummary.pendingEarnings,
        paidEarnings: earningsSummary.paidEarnings
      },
      earnings: earningsSummary,
      pendingEarnings: pendingEarnings,
      products: productStats,
      topProducts: Object.values(salesByProduct)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      salesTrend: Object.values(dailyTrend).sort((a, b) => a.date.localeCompare(b.date)),
      recentSales: allSales.slice(0, 20).map(sale => {
        const buyer = buyerMap[sale.buyerId];
        return {
          purchaseId: sale.purchaseId,
          productTitle: sale.contentId?.title || 'Unknown',
          buyerName: buyer?.name || buyer?.email || 'Unknown',
          amount: sale.amount,
          currency: sale.currency,
          purchasedAt: sale.purchasedAt,
          transactionId: sale.transactionId
        };
      })
    });
  } catch (error) {
    console.error('Error fetching seller analytics:', error);
    res.status(500).json({ error: 'Failed to fetch seller analytics' });
  }
});

// Helper function to update user stats
async function updateUserStats(userId, action, value = 1) {
  try {
    let userStats = await UserStats.findOne({ userId });
    
    if (!userStats) {
      userStats = new UserStats({ userId });
    }

    switch (action) {
      case 'upload':
        userStats.totalUploads += value;
        break;
      case 'like':
        userStats.totalLikes += value;
        break;
      case 'view':
        userStats.totalViews += value;
        break;
      case 'download':
        userStats.totalDownloads += value;
        break;
    }

    // Update reputation score
    userStats.reputationScore = calculateReputationScore(userStats);
    
    await userStats.save();
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

// Helper function to calculate reputation score
function calculateReputationScore(stats) {
  let score = 0;
  
  // Base points for uploads
  score += stats.totalUploads * 10;
  
  // Points for engagement
  score += stats.totalViews * 0.1;
  score += stats.totalLikes * 2;
  score += stats.totalDownloads * 5;
  
  // Bonus for consistent activity
  if (stats.totalUploads >= 10) score += 100;
  if (stats.totalUploads >= 50) score += 500;
  if (stats.totalUploads >= 100) score += 1000;
  
  return Math.floor(score);
}

// Helper function to update content rating
async function updateContentRating(contentId) {
  try {
    const reviews = await ContentReview.find({ 
      contentId, 
      status: 'active' 
    });
    
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      
      // Update content with new average rating
      await MarketplaceContent.findByIdAndUpdate(contentId, {
        $set: { averageRating: Math.round(avgRating * 10) / 10 }
      });
    }
  } catch (error) {
    console.error('Error updating content rating:', error);
  }
}

/**
 * @route   GET /api/marketplace/pending
 * @desc    Get all pending content (admin only)
 * @access  Private (Admin)
 */
router.get('/pending', verifyToken, async (req, res) => {
  try {
    // Check if user is admin (you'll need to implement this check)
    // For now, we'll allow any authenticated user to see pending content
    
    const pendingContent = await MarketplaceContent.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      content: pendingContent,
      total: pendingContent.length
    });
  } catch (error) {
    console.error('Error fetching pending content:', error);
    res.status(500).json({ error: 'Failed to fetch pending content' });
  }
});

/**
 * @route   POST /api/marketplace/approve/:id
 * @desc    Approve specific content (admin only)
 * @access  Private (Admin)
 */
router.post('/approve/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const content = await MarketplaceContent.findById(id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    if (content.status !== 'pending') {
      return res.status(400).json({ error: 'Content is not pending approval' });
    }
    
    content.status = 'approved';
    content.approvedAt = new Date();
    content.approvedBy = req.user.uid;
    await content.save();
    
    res.json({
      message: 'Content approved successfully',
      content: {
        id: content._id,
        title: content.title,
        status: content.status,
        approvedAt: content.approvedAt
      }
    });
  } catch (error) {
    console.error('Error approving content:', error);
    res.status(500).json({ error: 'Failed to approve content' });
  }
});

/**
 * @route   POST /api/marketplace/reject/:id
 * @desc    Reject specific content (admin only)
 * @access  Private (Admin)
 */
router.post('/reject/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const content = await MarketplaceContent.findById(id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    if (content.status !== 'pending') {
      return res.status(400).json({ error: 'Content is not pending approval' });
    }
    
    content.status = 'rejected';
    content.rejectedAt = new Date();
    content.rejectedBy = req.user.uid;
    content.rejectionReason = reason || 'No reason provided';
    await content.save();
    
    res.json({
      message: 'Content rejected successfully',
      content: {
        id: content._id,
        title: content.title,
        status: content.status,
        rejectedAt: content.rejectedAt,
        rejectionReason: content.rejectionReason
      }
    });
  } catch (error) {
    console.error('Error rejecting content:', error);
    res.status(500).json({ error: 'Failed to reject content' });
  }
});

/**
 * @route   POST /api/marketplace/publish-existing
 * @desc    Publish existing user content to marketplace
 * @access  Private
 */
router.post('/publish-existing', verifyToken, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { contentItems } = req.body;

    if (!contentItems || !Array.isArray(contentItems) || contentItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content items array is required'
      });
    }

    // Get the GeneratedContent model to fetch user's content
    const GeneratedContent = require('../models/GeneratedContent');
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const item of contentItems) {
      try {
        const { _id: contentId, marketplaceMetadata } = item;
        
        // Verify user owns this content
        const userContent = await GeneratedContent.findOne({
          _id: contentId,
          userId: userId
        });

        if (!userContent) {
          results.push({
            success: false,
            originalId: contentId,
            title: item.title || 'Unknown',
            error: 'Content not found or you do not have access to it'
          });
          errorCount++;
          continue;
        }

        // Validate marketplace metadata
        const { title, price, category, subject, difficulty, description, tags } = marketplaceMetadata;
        
        if (!title || !subject || !description || !category || !difficulty) {
          results.push({
            success: false,
            originalId: contentId,
            title: userContent.title,
            error: 'Missing required marketplace metadata (title, subject, description, category, difficulty)'
          });
          errorCount++;
          continue;
        }

        // Validate category and difficulty
        const validCategories = ['mathematics', 'science', 'history', 'literature', 'languages', 'arts', 'technology', 'business', 'health', 'other'];
        const validDifficulties = ['beginner', 'intermediate', 'advanced'];
        
        if (!validCategories.includes(category)) {
          results.push({
            success: false,
            originalId: contentId,
            title: userContent.title,
            error: 'Invalid category'
          });
          errorCount++;
          continue;
        }
        
        if (!validDifficulties.includes(difficulty)) {
          results.push({
            success: false,
            originalId: contentId,
            title: userContent.title,
            error: 'Invalid difficulty level'
          });
          errorCount++;
          continue;
        }

        // Check if user already has marketplace content with the same title
        const existingContent = await MarketplaceContent.findOne({
          creatorId: userId,
          title: title.trim(),
          status: { $in: ['pending', 'approved'] }
        });

        if (existingContent) {
          results.push({
            success: false,
            originalId: contentId,
            title: title,
            error: 'You already have marketplace content with this title'
          });
          errorCount++;
          continue;
        }

        // Map user content type to marketplace content type
        const contentTypeMapping = {
          'blog': 'blog',
          'summary': 'summary',
          'flashcards': 'flashcards',
          'quiz': 'quiz',
          'slides': 'slides',
          'text': 'document',
          'video': 'document',
          'document': 'document'
        };
        
        const marketplaceContentType = contentTypeMapping[userContent.type] || 'document';

        // Create marketplace content
        const newMarketplaceContent = new MarketplaceContent({
          contentId: userContent._id,
          creatorId: userId,
          title: title.trim(),
          description: description.trim(),
          category,
          subject: subject.trim(),
          difficulty,
          tags: tags || [],
          contentType: marketplaceContentType,
          isPersonal: false,
          contentData: userContent.contentData || userContent.content,
          price: Math.max(0, price || 0),
          status: 'pending',
          // Add metadata to track source
          metadata: {
            sourceType: 'user_content',
            originalContentId: userContent._id,
            originalTitle: userContent.title, // Keep track of original title
            originalCreatedAt: userContent.createdAt,
            originalUpdatedAt: userContent.updatedAt
          }
        });

        await newMarketplaceContent.save();

        // For existing user content, auto-approve since it's already been created by the user
        // and we trust their existing content library
        try {
          newMarketplaceContent.status = 'approved';
          newMarketplaceContent.approvedAt = new Date();
          newMarketplaceContent.approvedBy = 'system_auto_approve';
          await newMarketplaceContent.save();
        } catch (approvalError) {
          console.error('Auto-approval failed:', approvalError);
          // Continue with pending status if auto-approval fails
        }

        // Update user stats
        await updateUserStats(userId, 'upload', 1);

        results.push({
          success: true,
          originalId: contentId,
          marketplaceContentId: newMarketplaceContent._id,
          title: title,
          status: newMarketplaceContent.status,
          message: newMarketplaceContent.status === 'approved' ? 
            'Content published and approved automatically' : 
            'Content published and pending approval'
        });
        successCount++;

      } catch (contentError) {
        console.error(`Error publishing content ${item._id}:`, contentError);
        results.push({
          success: false,
          originalId: item._id,
          title: item.title || 'Unknown',
          error: contentError.message
        });
        errorCount++;
      }
    }

    res.status(201).json({
      success: true,
      results,
      summary: {
        total: contentItems.length,
        successful: successCount,
        failed: errorCount
      }
    });

  } catch (error) {
    console.error('Error publishing existing content:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to publish content to marketplace',
      details: error.message 
    });
  }
});

/**
 * @route   DELETE /api/marketplace/content/:id
 * @desc    Delete marketplace content (creator only)
 * @access  Private
 */
/**
 * @route   PUT /api/marketplace/content/:id
 * @desc    Update marketplace content (seller only)
 * @access  Private
 */
router.put('/content/:id', verifyToken, upload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    // Find the content
    const content = await MarketplaceContent.findById(id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Check if user is the creator
    if (content.creatorId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own content' });
    }
    
    // Allowed fields for editing
    const allowedFields = ['title', 'description', 'category', 'subject', 'difficulty', 'tags', 'price', 'currency'];
    const updates = {};
    
    // Update allowed fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'tags' && Array.isArray(req.body[field])) {
          updates[field] = req.body[field];
        } else if (field === 'price') {
          updates[field] = Math.max(0, parseFloat(req.body[field]) || 0);
        } else {
          updates[field] = req.body[field];
        }
      }
    });
    
    // Handle file upload if provided
    if (req.file) {
      // Delete old file if exists
      if (content.filePath && fs.existsSync(content.filePath)) {
        try {
          fs.unlinkSync(content.filePath);
        } catch (fileError) {
          console.error('Error deleting old file:', fileError);
        }
      }
      
      updates.filePath = req.file.path;
      updates.contentData = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      };
    }
    
    // If significant changes, set status back to pending for re-approval
    const significantChanges = ['title', 'description', 'category', 'subject', 'contentData', 'filePath'];
    const hasSignificantChanges = significantChanges.some(field => updates[field] !== undefined);
    
    if (hasSignificantChanges && content.status === 'approved') {
      updates.status = 'pending';
      updates.approvedAt = null;
      updates.approvedBy = null;
    }
    
    // Update content
    Object.assign(content, updates);
    await content.save();
    
    res.json({
      message: 'Content updated successfully',
      content: content
    });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

router.delete('/content/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    // Find the content
    const content = await MarketplaceContent.findById(id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Check if user is the creator of the content
    if (content.creatorId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own content' });
    }
    
    // Delete associated file if it exists
    if (content.filePath && fs.existsSync(content.filePath)) {
      try {
        fs.unlinkSync(content.filePath);
        console.log('Deleted file:', content.filePath);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with content deletion even if file deletion fails
      }
    }
    
    // Delete the content from database
    await MarketplaceContent.findByIdAndDelete(id);
    
    // Update user stats
    await updateUserStats(userId, 'upload', -1);
    
    res.json({
      message: 'Content deleted successfully',
      contentId: id
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// ==================== PAYOUT ROUTES ====================

/**
 * @route   GET /api/marketplace/payouts/earnings
 * @desc    Get seller's earnings summary
 * @access  Private
 */
router.get('/payouts/earnings', verifyToken, async (req, res) => {
  try {
    const sellerId = req.user.uid;
    const totalEarnings = await PaymentService.getTotalEarnings(sellerId);
    const pendingEarnings = await PaymentService.getPendingEarnings(sellerId);
    
    res.json({
      ...totalEarnings,
      pendingDetails: pendingEarnings
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

/**
 * @route   GET /api/marketplace/payouts/history
 * @desc    Get seller's payout history
 * @access  Private
 */
router.get('/payouts/history', verifyToken, async (req, res) => {
  try {
    const Payout = require('../models/Payout');
    const sellerId = req.user.uid;
    
    const payouts = await Payout.find({ sellerId })
      .sort({ requestedAt: -1 })
      .limit(50);
    
    res.json(payouts);
  } catch (error) {
    console.error('Error fetching payout history:', error);
    res.status(500).json({ error: 'Failed to fetch payout history' });
  }
});

/**
 * @route   POST /api/marketplace/payouts/request
 * @desc    Request a payout
 * @access  Private
 */
router.post('/payouts/request', verifyToken, async (req, res) => {
  try {
    const sellerId = req.user.uid;
    const { amount, currency, payoutMethod, payoutDetails } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const payout = await PaymentService.createPayoutRequest(sellerId, {
      amount: parseFloat(amount),
      currency: currency || 'USD',
      payoutMethod: payoutMethod || 'manual',
      payoutDetails: payoutDetails || {}
    });
    
    res.json({
      success: true,
      message: 'Payout request submitted successfully',
      payout
    });
  } catch (error) {
    console.error('Error creating payout request:', error);
    res.status(400).json({ error: error.message || 'Failed to create payout request' });
  }
});

/**
 * @route   GET /api/marketplace/payouts/:payoutId
 * @desc    Get payout details
 * @access  Private
 */
router.get('/payouts/:payoutId', verifyToken, async (req, res) => {
  try {
    const Payout = require('../models/Payout');
    const { payoutId } = req.params;
    const userId = req.user.uid;
    
    const payout = await Payout.findOne({ payoutId });
    if (!payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }
    
    // Check if user is the seller or admin
    const AdminService = require('../services/adminService');
    const isAdmin = await AdminService.isAdmin(userId);
    
    if (payout.sellerId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(payout);
  } catch (error) {
    console.error('Error fetching payout:', error);
    res.status(500).json({ error: 'Failed to fetch payout' });
  }
});

module.exports = router;
