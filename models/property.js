const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: String,
    description: String,
    type: {
      type: String,
      enum: ["land", "apartment", "house", "commercial"],
    },

    address: String,
    locationState: String,
    locationDistrict: String,

    geoLat: Number,
    geoLng: Number,

    basePrice: Number,
    buyNowPrice: Number,

    isAuction: { type: Boolean, default: false },
    auctionStartsAt: Date,
    auctionEndsAt: Date,
    auctionStep: { type: Number, default: 1000 },
    auctionReservePrice: Number,
    auctionAutoExtendMins: { type: Number, default: 5 },
    auctionLastBidWindowMins: { type: Number, default: 10 },

    currentHighestBid: { type: Number, default: 0 },
    currentHighestBidder: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: {
  type: String,
  enum: ["draft", "published", "archived"],
  default: "draft"
},
    verificationStatus: {
      type: String,
      default: "submitted",
      enum: [ "submitted", "approved", "rejected"],
    },
    rejectionMessage: { type: String, default: null },
    verificationRequestedAt: Date,
    verificationReviewedAt: Date,
    verificationReviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

   media: [
  {
    url: { type: String, required: true },
    type: { type: String, default: "image" }, // image/pdf/video
    uploadedAt: { type: Date, default: Date.now }
  }
],
   docs: [
  {
    url: { type: String, required: true },
    name: String,
    type: { type: String, default: "doc" },
    uploadedAt: { type: Date, default: Date.now }
  }
],
bhk: String,         
size: String,
    views: { type: Number, default: 0 },
    favouritesCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    featuredUntil: Date,

    soldTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    soldAt: Date,

    deletedAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Property", propertySchema);
