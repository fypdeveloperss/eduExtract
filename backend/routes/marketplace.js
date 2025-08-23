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

    // Run plagiarism check (we'll implement this service next)
    try {
      const plagiarismResult = await PlagiarismService.checkPlagiarism(
        fileData ? fileData.originalName : contentData, 
        contentType
      );
      newContent.plagiarismScore = plagiarismResult.score;
      newContent.plagiarismReport = plagiarismResult.report;
      
      // Auto-approve if plagiarism score is good
      if (plagiarismResult.score < 30) {
        newContent.status = 'approved';
        await newContent.save();
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

    // Get reviews for this content
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
      reviews,
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
    
    const contentTypes = ['blog', 'slides', 'flashcards', 'quiz', 'summary', 'personal'];

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

module.exports = router;
