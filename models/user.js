

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: null },
    passwordHash: { type: String, required: null },
    isVerified: { type: Boolean, default: false },
    role: { type: String, default: 'user', enum: ['user', 'vendor', 'admin'] },
    status: { type: String, default: 'active', enum: ['active', 'blocked'] },
    avatar: { type: String, default: null },
    twoFA: { type: Boolean, default: false },
    twoFASecret: { type: String, default: null },

    isVendor: { type: Boolean, default: false },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },

    googleId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
