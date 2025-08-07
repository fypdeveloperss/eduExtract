const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin'
  },
  addedBy: {
    type: String, // UID of the admin who added this admin
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Admin', adminSchema);
