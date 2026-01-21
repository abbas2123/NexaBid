const mongoose = require('mongoose');
const propertySchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: String,
    description: String,
    type: {
      type: String,
      enum: ['land', 'apartment', 'house', 'commercial'],
    },
    address: String,
    locationState: String,
    locationDistrict: String,
    geoLat: Number,
    geoLng: Number,
    basePrice: Number,
    isAuction: { type: Boolean, default: false },
    auctionStartsAt: Date,
    auctionEndsAt: Date,
    auctionStep: { type: Number, default: 1000 },
    auctionReservePrice: Number,
    extended: { type: Boolean, default: false },
    autoBidLock: { type: Boolean, default: false },
    currentHighestBid: { type: Number, default: 0 },
    currentHighestBidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['draft', 'published', 'owned', 'closed'],
      default: 'draft',
    },
    verificationStatus: {
      type: String,
      default: 'submitted',
      enum: ['submitted', 'approved', 'rejected'],
    },
    rejectionMessage: { type: String, default: null },
    verificationRequestedAt: Date,
    verificationReviewedAt: Date,
    verificationReviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    media: [
      {
        url: { type: String, required: true },
        type: { type: String, default: 'image' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    docs: [
      {
        url: { type: String, required: true },
        name: String,
        type: { type: String, default: 'doc' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    bhk: String,
    size: String,
    views: { type: Number, default: 0 },
    favouritesCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    featuredUntil: Date,
    soldTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    soldAt: Date,
    isBlocked: { type: Boolean, default: false },
    blockingReason: { type: String, default: '' },
    deletedAt: Date,
  },
  { timestamps: true }
);

// Compound indexes for common filters
propertySchema.index({ status: 1, type: 1, basePrice: 1 });
propertySchema.index({ isAuction: 1, auctionEndsAt: 1 });
propertySchema.index({ sellerId: 1, status: 1 });

// Text index for search
propertySchema.index({
  title: 'text',
  address: 'text',
  locationDistrict: 'text',
  locationState: 'text'
});
module.exports = mongoose.model('Property', propertySchema);
