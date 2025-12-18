const mongoose = require('mongoose');

const propertyBidSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },

    bidderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    // 🔁 AUTO BID
    isAutoBid: {
      type: Boolean,
      default: false,
    },

    autoBidMax: {
      type: Number,
      default: null,
    },

    // 📌 STATUS
    bidStatus: {
      type: String,
      enum: ['active', 'outbid', 'won', 'cancelled'],
      default: 'active',
    },

    isWinningBid: {
      type: Boolean,
      default: false,
    },

    escrowPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
  },
  { timestamps: true }
);

// 🔥 INDEXES
propertyBidSchema.index({ propertyId: 1, amount: -1 });
propertyBidSchema.index({ bidderId: 1, propertyId: 1 }, { unique: true });

module.exports = mongoose.model('PropertyBid', propertyBidSchema);
