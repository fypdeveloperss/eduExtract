const User = require('../models/User');

class UserService {
  // Create or update user
  static async createOrUpdateUser(uid, name, email) {
    try {
      let user = await User.findOne({ uid });
      
      if (user) {
        // Update existing user
        user.name = name;
        user.email = email;
        user.lastLogin = new Date();
        await user.save();
      } else {
        // Create new user
        user = new User({
          uid,
          name,
          email
        });
        await user.save();
      }
      
      return user;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  // Get all users
  static async getAllUsers() {
    try {
      return await User.find().sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Get user by ID
  static async getUserById(userId) {
    try {
      return await User.findOne({ uid: userId });
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getUserStats() {
    try {
      const totalUsers = await User.countDocuments();
      const recentUsers = await User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      
      return {
        totalUsers,
        recentUsers
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}

module.exports = UserService; 