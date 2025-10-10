const express = require('express');
const router = express.Router();
const ForumCategory = require('../models/ForumCategory');
const ForumTopic = require('../models/ForumTopic');
const ForumPost = require('../models/ForumPost');
const User = require('../models/User');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Helper function to get latest user data from database
async function getLatestUserData(uid, fallbackUser) {
  try {
    const user = await User.findOne({ uid }).lean();
    return {
      displayName: user?.name || fallbackUser.displayName,
      email: user?.email || fallbackUser.email,
      name: user?.name
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return {
      displayName: fallbackUser.displayName,
      email: fallbackUser.email,
      name: fallbackUser.name
    };
  }
}

// Create default categories if none exist
async function createDefaultCategories() {
  try {
    const existingCount = await ForumCategory.countDocuments();
    if (existingCount === 0) {
      const defaultCategories = [
        {
          name: 'General Discussion',
          description: 'General topics and discussions about the platform',
          order: 1
        },
        {
          name: 'Educational Content',
          description: 'Discussions about educational materials, learning resources, and study tips',
          order: 2
        },
        {
          name: 'Technical Support',
          description: 'Get help with technical issues and platform features',
          order: 3
        },
        {
          name: 'Feature Requests',
          description: 'Suggest new features and improvements for the platform',
          order: 4
        },
        {
          name: 'Marketplace',
          description: 'Discussions about buying, selling, and sharing educational content',
          order: 5
        },
        {
          name: 'Collaboration',
          description: 'Find study partners and discuss collaborative learning',
          order: 6
        }
      ];

      await ForumCategory.insertMany(defaultCategories);
      console.log('Default forum categories created successfully');
    }
  } catch (error) {
    console.error('Error creating default categories:', error);
  }
}

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    // Create default categories if none exist
    await createDefaultCategories();
    
    const categories = await ForumCategory.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .populate('lastTopic', 'title authorName createdAt')
      .lean();
    
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// Get all topics with optional category filter
router.get('/topics', async (req, res) => {
  try {
    const { categoryId, page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    if (categoryId) {
      query.categoryId = categoryId;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    const topics = await ForumTopic.find(query)
      .populate('categoryId', 'name')
      .populate('lastPostId', 'authorName createdAt')
      .sort({ isPinned: -1, lastPostAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await ForumTopic.countDocuments(query);
    
    res.json({ 
      success: true, 
      topics, 
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch topics' });
  }
});

// Get single topic with posts
router.get('/topics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, incrementView = 'true' } = req.query;
    const skip = (page - 1) * limit;
    
    // Get topic details
    const topic = await ForumTopic.findById(id)
      .populate('categoryId', 'name')
      .lean();
    
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }
    
    // Only increment view count if incrementView is true
    if (incrementView === 'true') {
      await ForumTopic.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
      topic.viewCount += 1;
    }
    
    // Get posts for this topic
    const posts = await ForumPost.find({ topicId: id })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const totalPosts = await ForumPost.countDocuments({ topicId: id });
    
    res.json({ 
      success: true, 
      topic, 
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalPosts,
        pages: Math.ceil(totalPosts / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching topic:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch topic' });
  }
});

// Create new topic
router.post('/topics', verifyToken, async (req, res) => {
  try {
    const { title, content, categoryId } = req.body;
    const { uid } = req.user;
    
    // Fetch latest user data from database
    const userData = await getLatestUserData(uid, req.user);
    const { displayName, email, name } = userData;
    
    // Debug logging for Google auth
    console.log('Forum user data:', { uid, displayName, email, name });
    console.log('Database user data:', userData);
    
    if (!title || !content || !categoryId) {
      return res.status(400).json({ success: false, error: 'Title, content, and category are required' });
    }
    
    // Check if category exists
    const category = await ForumCategory.findById(categoryId);
    if (!category) {
      return res.status(400).json({ success: false, error: 'Category not found' });
    }
    
    const topic = new ForumTopic({
      title,
      content,
      categoryId,
      authorId: uid,
      authorName: displayName || name || email?.split('@')[0] || `User_${uid.slice(-6)}` || 'Anonymous',
      authorEmail: email || 'unknown@example.com'
    });
    
    await topic.save();
    
    // Update category topic count
    await category.updateTopicCount();
    
    res.status(201).json({ success: true, topic });
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ success: false, error: 'Failed to create topic' });
  }
});

// Reply to topic
router.post('/topics/:id/posts', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const { uid } = req.user;
    
    // Fetch latest user data from database
    const userData = await getLatestUserData(uid, req.user);
    const { displayName, email, name } = userData;
    
    // Debug logging for Google auth
    console.log('Forum post user data:', { uid, displayName, email, name });
    console.log('Database user data:', userData);
    
    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }
    
    // Check if topic exists
    const topic = await ForumTopic.findById(id);
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }
    
    if (topic.isLocked) {
      return res.status(400).json({ success: false, error: 'Topic is locked' });
    }
    
    const post = new ForumPost({
      content,
      topicId: id,
      authorId: uid,
      authorName: displayName || name || email?.split('@')[0] || `User_${uid.slice(-6)}` || 'Anonymous',
      authorEmail: email || 'unknown@example.com'
    });
    
    await post.save();
    
    res.status(201).json({ success: true, post });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// Edit post
router.put('/posts/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, editReason } = req.body;
    const { uid } = req.user;
    
    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }
    
    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    // Check if user owns the post
    if (post.authorId !== uid) {
      return res.status(403).json({ success: false, error: 'You can only edit your own posts' });
    }
    
    post.content = content;
    post.isEdited = true;
    post.editReason = editReason || '';
    post.editedAt = new Date();
    
    await post.save();
    
    res.json({ success: true, post });
  } catch (error) {
    console.error('Error editing post:', error);
    res.status(500).json({ success: false, error: 'Failed to edit post' });
  }
});

// Delete post
router.delete('/posts/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;
    
    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    // Check if user owns the post or is admin
    const isAdmin = await verifyAdmin(req, res, () => {});
    if (post.authorId !== uid && !isAdmin) {
      return res.status(403).json({ success: false, error: 'You can only delete your own posts' });
    }
    
    await ForumPost.findByIdAndDelete(id);
    
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// Search topics
router.get('/search', async (req, res) => {
  try {
    const { q, categoryId, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }
    
    let query = {
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } }
      ]
    };
    
    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    const topics = await ForumTopic.find(query)
      .populate('categoryId', 'name')
      .populate('lastPostId', 'authorName createdAt')
      .sort({ lastPostAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await ForumTopic.countDocuments(query);
    
    res.json({ 
      success: true, 
      topics, 
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error searching topics:', error);
    res.status(500).json({ success: false, error: 'Failed to search topics' });
  }
});

// ===== ADMIN ONLY ROUTES =====

// Create new category (Admin only)
router.post('/categories', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, description, order = 0 } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ success: false, error: 'Name and description are required' });
    }
    
    // Check if category with same name exists
    const existingCategory = await ForumCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) {
      return res.status(400).json({ success: false, error: 'Category with this name already exists' });
    }
    
    const category = new ForumCategory({
      name,
      description,
      order: parseInt(order) || 0
    });
    
    await category.save();
    
    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

// Update category (Admin only)
router.put('/categories/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, order, isActive } = req.body;
    
    const category = await ForumCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    // Check if another category with same name exists
    if (name && name !== category.name) {
      const existingCategory = await ForumCategory.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });
      if (existingCategory) {
        return res.status(400).json({ success: false, error: 'Category with this name already exists' });
      }
    }
    
    if (name) category.name = name;
    if (description) category.description = description;
    if (order !== undefined) category.order = parseInt(order);
    if (isActive !== undefined) category.isActive = isActive;
    
    await category.save();
    
    res.json({ success: true, category });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

// Delete category (Admin only)
router.delete('/categories/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await ForumCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    // Check if category has topics
    const topicCount = await ForumTopic.countDocuments({ categoryId: id });
    if (topicCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete category. It has ${topicCount} topics. Please move or delete the topics first.` 
      });
    }
    
    await ForumCategory.findByIdAndDelete(id);
    
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

// Get all categories for admin (including inactive)
router.get('/admin/categories', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const categories = await ForumCategory.find()
      .sort({ order: 1, createdAt: 1 })
      .populate('lastTopic', 'title authorName createdAt')
      .lean();
    
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// Get all posts for admin moderation
router.get('/admin/posts', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, categoryId, topicId } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { content: { $regex: search, $options: 'i' } },
        { authorName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (topicId) {
      query.topicId = topicId;
    }
    
    // If categoryId is provided, find posts from topics in that category
    if (categoryId) {
      const topics = await ForumTopic.find({ categoryId }).select('_id');
      query.topicId = { $in: topics.map(t => t._id) };
    }
    
    const posts = await ForumPost.find(query)
      .populate('topicId', 'title categoryId')
      .populate({
        path: 'topicId',
        populate: {
          path: 'categoryId',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await ForumPost.countDocuments(query);
    
    res.json({ 
      success: true, 
      posts, 
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching admin posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

// Get all topics for admin moderation
router.get('/admin/topics', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, categoryId } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { authorName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    const topics = await ForumTopic.find(query)
      .populate('categoryId', 'name')
      .populate('lastPostId', 'authorName createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await ForumTopic.countDocuments(query);
    
    res.json({ 
      success: true, 
      topics, 
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching admin topics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch topics' });
  }
});

// Admin delete post (with reason)
router.delete('/admin/posts/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    await ForumPost.findByIdAndDelete(id);
    
    res.json({ 
      success: true, 
      message: 'Post deleted successfully',
      deletedPost: {
        id: post._id,
        content: post.content.substring(0, 100) + '...',
        authorName: post.authorName,
        reason: reason || 'No reason provided'
      }
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// Admin delete topic (with reason)
router.delete('/admin/topics/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const topic = await ForumTopic.findById(id);
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }
    
    // Delete all posts in this topic first
    await ForumPost.deleteMany({ topicId: id });
    
    // Delete the topic
    await ForumTopic.findByIdAndDelete(id);
    
    // Update category topic count
    const category = await ForumCategory.findById(topic.categoryId);
    if (category) {
      await category.updateTopicCount();
    }
    
    res.json({ 
      success: true, 
      message: 'Topic and all its posts deleted successfully',
      deletedTopic: {
        id: topic._id,
        title: topic.title,
        authorName: topic.authorName,
        reason: reason || 'No reason provided'
      }
    });
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ success: false, error: 'Failed to delete topic' });
  }
});

// Initialize default categories (public route for setup)
router.post('/init-categories', async (req, res) => {
  try {
    await createDefaultCategories();
    
    const categories = await ForumCategory.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    
    res.json({ 
      success: true, 
      message: 'Default categories initialized successfully',
      categories 
    });
  } catch (error) {
    console.error('Error initializing categories:', error);
    res.status(500).json({ success: false, error: 'Failed to initialize categories' });
  }
});

module.exports = router;
