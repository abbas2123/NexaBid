

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    uppercase: true,
    required: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['flat', 'percent', 'cashback'],
    required: true,
  },
  value: Number,
  maxDiscount: Number,
  minPurchaseAmount: Number,
  startsAt: Date,
  expiresAt: Date,
  usageLimit: Number,
  perUserLimit: Number,
  applicableTo: {
    type: String,
    enum: ['all', 'tenders', 'properties', 'vendors'],
    default: 'all',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isActive: { type: Boolean, default: true },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Coupon', couponSchema);
