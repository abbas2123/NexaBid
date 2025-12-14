const mongoose = require("mongoose");

const tenderBidSchema = new mongoose.Schema(
  {
    tenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tender",
      required: true
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "withdrawn",
        "disqualified",
        "qualified",
        "awarded"
      ],
      default: "draft"
    },

    emdPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
    docFeePaymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },

    submittedAt: { type: Date, default: null },

    version: { type: Number, default: 1 },

   
    proposal: {
      files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
      remarks: String
    },

    techForms: {
      files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
      remarks: String
    },


    // PHASE 2 — FINANCIAL BID
    finForms: {
      files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
      remarks: String
    },

    quotes: {
      files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
      amount: Number,
      remarks: String
    },

    auditTrail: [
      {
        action: String,    
        time: Date,
        byUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
      }
    ],
    finReviewStatus: {
  type: String,
  enum: ["pending", "accepted", "rejected"],
  default: "pending"
},

techReviewStatus: {
  type: String,
  enum: ["pending", "accepted", "rejected"],
  default: "pending"
},

isWinner: { type: Boolean, default: false }

  },
  { timestamps: true }
);


tenderBidSchema.index({ tenderId: 1, vendorId: 1 }, { unique: true });
tenderBidSchema.index({ vendorId: 1 });

module.exports = mongoose.model("TenderBid", tenderBidSchema);