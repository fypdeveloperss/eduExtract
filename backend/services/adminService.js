const Admin = require('../models/Admin');
const User = require('../models/User');

class AdminService {
  // Create admin database record for existing hardcoded admin
  static async initializeSuperAdmin(uid, email, name) {
    try {
      const existingAdmin = await Admin.findOne({ uid });
      if (!existingAdmin) {
        const superAdmin = new Admin({
          uid,
          email,
          name,
          role: 'super_admin',
          addedBy: uid, // Self-added
          isActive: true
        });
        await superAdmin.save();
        console.log('Super admin initialized:', email);
      }
      return existingAdmin || await Admin.findOne({ uid });
    } catch (error) {
      console.error('Error initializing super admin:', error);
      throw error;
    }
  }

  // Check if user is admin (checks both hardcoded and database)
  static async isAdmin(uid) {
    try {
      // First check hardcoded admin UIDs (for backward compatibility)
      const { ADMIN_UIDS } = require('../config/firebase-admin');
      if (ADMIN_UIDS.includes(uid)) {
        return true;
      }

      // Then check database
      const admin = await Admin.findOne({ uid, isActive: true });
      return !!admin;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Get admin role
  static async getAdminRole(uid) {
    try {
      // Check if it's a hardcoded super admin
      const { ADMIN_UIDS } = require('../config/firebase-admin');
      if (ADMIN_UIDS.includes(uid)) {
        return 'super_admin';
      }

      const admin = await Admin.findOne({ uid, isActive: true });
      return admin ? admin.role : null;
    } catch (error) {
      console.error('Error getting admin role:', error);
      return null;
    }
  }

  // Add new admin by email
  static async addAdminByEmail(email, addedByUid, role = 'admin') {
    try {
      // First check if the person adding is a super admin
      const adderRole = await this.getAdminRole(addedByUid);
      if (adderRole !== 'super_admin') {
        throw new Error('Only super admins can add new admins');
      }

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User with this email not found. They must register first.');
      }

      // Check if already admin
      const existingAdmin = await Admin.findOne({ uid: user.uid });
      if (existingAdmin) {
        throw new Error('User is already an admin');
      }

      // Create admin record
      const admin = new Admin({
        uid: user.uid,
        email: user.email,
        name: user.name,
        role,
        addedBy: addedByUid,
        isActive: true
      });

      await admin.save();
      return admin;
    } catch (error) {
      console.error('Error adding admin:', error);
      throw error;
    }
  }

  // Get all admins
  static async getAllAdmins() {
    try {
      return await Admin.find({ isActive: true })
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting all admins:', error);
      throw error;
    }
  }

  // Remove admin
  static async removeAdmin(adminUid, removedByUid) {
    try {
      // Check if the person removing is a super admin
      const removerRole = await this.getAdminRole(removedByUid);
      if (removerRole !== 'super_admin') {
        throw new Error('Only super admins can remove admins');
      }

      // Cannot remove hardcoded super admins
      const { ADMIN_UIDS } = require('../config/firebase-admin');
      if (ADMIN_UIDS.includes(adminUid)) {
        throw new Error('Cannot remove hardcoded super admin');
      }

      // Cannot remove self
      if (adminUid === removedByUid) {
        throw new Error('Cannot remove yourself');
      }

      const admin = await Admin.findOne({ uid: adminUid });
      if (!admin) {
        throw new Error('Admin not found');
      }

      admin.isActive = false;
      await admin.save();
      return admin;
    } catch (error) {
      console.error('Error removing admin:', error);
      throw error;
    }
  }

  // Update admin role
  static async updateAdminRole(adminUid, newRole, updatedByUid) {
    try {
      // Check if the person updating is a super admin
      const updaterRole = await this.getAdminRole(updatedByUid);
      if (updaterRole !== 'super_admin') {
        throw new Error('Only super admins can update admin roles');
      }

      // Cannot update hardcoded super admins
      const { ADMIN_UIDS } = require('../config/firebase-admin');
      if (ADMIN_UIDS.includes(adminUid)) {
        throw new Error('Cannot update hardcoded super admin role');
      }

      const admin = await Admin.findOne({ uid: adminUid, isActive: true });
      if (!admin) {
        throw new Error('Admin not found');
      }

      admin.role = newRole;
      await admin.save();
      return admin;
    } catch (error) {
      console.error('Error updating admin role:', error);
      throw error;
    }
  }

  // Get admin statistics
  static async getAdminStats() {
    try {
      const totalAdmins = await Admin.countDocuments({ isActive: true });
      const superAdmins = await Admin.countDocuments({ role: 'super_admin', isActive: true });
      const regularAdmins = await Admin.countDocuments({ role: 'admin', isActive: true });
      const moderators = await Admin.countDocuments({ role: 'moderator', isActive: true });

      return {
        total: totalAdmins,
        superAdmins,
        admins: regularAdmins,
        moderators
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      throw error;
    }
  }
}

module.exports = AdminService;
