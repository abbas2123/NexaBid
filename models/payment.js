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
    gatewayPaymentId: String,
    gatewayTransactionId: String,
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },
    refundAmount: { type: Number, default: 0 },
    refundReason: {
      type: String,
      enum: ['failed_bid', 'withdrawal', 'manual', 'tender_lost', null],
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

// Indexes for common queries
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ contextId: 1, contextType: 1 });

paymentSchema.index({ gatewayPaymentId: 1 });
paymentSchema.pre('save', async function () {
  if (!this.orderNumber) {
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    const time = Date.now().toString().slice(-4);
    this.orderNumber = `NEXA-${rand}${time}`;
  }
});
module.exports = mongoose.model('Payment', paymentSchema);
