const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    type: {
      type: String,
      enum: [
        "emd",
        "doc_fee",
        "property_deposit",
        "verification_fee",
        "commission",
        "participation_fee"
      ],
      required: true
    },

    amount: { type: Number, required: true },

    gateway: {
      type: String,
      enum: ["razorpay", "stripe", "cash", "wallet"],
      required: true
    },

    gatewayPaymentId: { type: String, default: null },

    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending"
    },

    refundAmount: { type: Number, default: null },

    refundReason: {
      type: String,
      enum: ["failed_bid", "withdrawal", "manual", null],
      default: null
    },

    metadata: {
      type: Object,
      default: {} // raw gateway payload, couponApplied, walletUsed, etc.
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Indexes
paymentSchema.index({ userId: 1 });
paymentSchema.index(
  { gatewayPaymentId: 1 },
  { unique: true, partialFilterExpression: { gatewayPaymentId: { $ne: null } } }
);

module.exports = mongoose.model("Payment", paymentSchema);