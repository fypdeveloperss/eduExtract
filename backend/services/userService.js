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

  // Get all users with optional pagination
  static async getAllUsers(page = 1, limit = 20, search = '') {
    try {
      let query = {};
      
      // Add search functionality if search term is provided
      if (search) {
        query = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        };
      }
      
      console.log(`UserService.getAllUsers called with page=${page}, limit=${limit}, search="${search}"`);
      console.log('Query:', JSON.stringify(query));
      
      // If no pagination requested (legacy), return all users
      if (page === undefined || limit === undefined) {
        const allUsers = await User.find(query).sort({ createdAt: -1 });
        console.log(`Returning ${allUsers.length} users (no pagination)`);
        return allUsers;
      }
      
      // Calculate skip value for pagination
      const skip = (page - 1) * limit;
      
      // Get users with pagination
      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination metadata
      const total = await User.countDocuments(query);
      
      console.log(`Found ${users.length} users out of ${total} total`);
      
      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
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

  // Get user by UID
  static async getUserByUid(uid) {
    try {
      return await User.findOne({ uid });
    } catch (error) {
      console.error('Error getting user by UID:', error);
      throw error;
    }
  }

  // Update user
  static async updateUser(uid, updateData) {
    try {
      const user = await User.findOne({ uid });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update only the provided fields
      if (updateData.name !== undefined) {
        user.name = updateData.name;
      }
      if (updateData.email !== undefined) {
        user.email = updateData.email;
      }
      if (updateData.isActive !== undefined) {
        user.isActive = updateData.isActive;
      }
      
      user.lastLogin = new Date();
      await user.save();
      
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  static async deleteUser(uid) {
    try {
      const result = await User.deleteOne({ uid });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
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