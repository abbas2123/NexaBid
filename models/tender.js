const mongoose = require("mongoose");

const tenderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    dept: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: null
    },

    eligibility: {
      categories: {
        type: [String],
        default: []
      },
      minGrade: {
        type: String,
        default: null
      }
    },

    type: {
      type: String,
      enum: ["open", "restricted"],
      default: "open"
    },

    emdAmount: {
      type: Number,
      default: null
    },

    docFee: {
      type: Number,
      default: null
    },

    publishAt: {
      type: Date,
      default: null
    },

    bidStartAt: {
      type: Date,
      default: null
    },

    bidEndAt: {
      type: Date,
      required: true
    },

    techOpenAt: {
      type: Date,
      default: null
    },

    finOpenAt: {
      type: Date,
      default: null
    },

    files: {
      type: Array,
      default: []
    },

    version: {
      type: Number,
      default: 1
    },

    status: {
      type: String,
      enum: ["draft", "published", "closed", "awarded", "cancelled"],
      default: "draft"
    },

    awardedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    awardedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Indexes
tenderSchema.index({ status: 1, bidEndAt: -1 });
tenderSchema.index({ category: 1 });
tenderSchema.index({ dept: "text", title: "text" });

module.exports = mongoose.model("Tender", tenderSchema);