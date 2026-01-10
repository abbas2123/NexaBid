

const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true,
  },
  source: {
    type: String,
    enum: ['refund', 'coupon', 'admin', 'payment'],
    required: true,
  },
  amount: Number,
  balanceAfter: Number,
  metadata: Object,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
