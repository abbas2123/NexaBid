// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    orderNumber: { type: String, unique: true },

    contextType: {
      type: String,
      enum: ['property', 'tender'],
      required: true,
    },

    contextId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    type: {
      type: String,
      enum: ['participation_fee', 'emd', 'doc_fee', 'commission'],
      required: true,
    },

    amount: { type: Number, required: true },

    gateway: {
      type: String,
      enum: ['razorpay', 'wallet'],
      default: 'razorpay',
    },

    gatewayPaymentId: String, // Razorpay order_id
    gatewayTransactionId: String, // Razorpay payment_id

    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },

    refundAmount: { type: Number, default: 0 },

    refundReason: {
      type: String,
      enum: ['failed_bid', 'withdrawal', 'manual', null],
      default: null,
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

paymentSchema.pre('save', function preSave(_next) {
  if (!this.orderNumber) {
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    const time = Date.now().toString().slice(-4);
    this.orderNumber = `NEXA-${rand}${time}`;
  }
});
paymentSchema.index({ orderNumber: 1 }, { unique: true });
module.exports = mongoose.model('Payment', paymentSchema);
