const GeneratedContent = require('../models/GeneratedContent');

class ContentService {
  // Create new content
  static async createContent(contentData) {
    try {
      const content = new GeneratedContent(contentData);
      await content.save();
      return content;
    } catch (error) {
      console.error('Error creating content:', error);
      throw error;
    }
  }

  // Get content by user ID
  static async getContentByUserId(userId) {
    try {
      return await GeneratedContent.find({ userId }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting content by user ID:', error);
      throw error;
    }
  }

  // Get content by ID
  static async getContentById(contentId) {
    try {
      return await GeneratedContent.findById(contentId);
    } catch (error) {
      console.error('Error getting content by ID:', error);
      throw error;
    }
  }

  // Get all content (for admin)
  static async getAllContent() {
    try {
      return await GeneratedContent.find().sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting all content:', error);
      throw error;
    }
  }

  // Get content statistics
  static async getContentStats() {
    try {
      const totalContent = await GeneratedContent.countDocuments();
      const todayContent = await GeneratedContent.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      
      const contentByType = await GeneratedContent.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);
      
      return {
        totalContent,
        todayContent,
        contentByType
      };
    } catch (error) {
      console.error('Error getting content stats:', error);
      throw error;
    }
  }

  // Delete content
  static async deleteContent(contentId) {
    try {
      return await GeneratedContent.findByIdAndDelete(contentId);
    } catch (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  }
}

module.exports = ContentService; 