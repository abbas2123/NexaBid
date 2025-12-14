const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema(
  {
    tenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tender",
      required: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // publisher
      required: true,
    },

    poNumber: {
      type: String,
      required: true,
      unique: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    startDate: { type: Date },
    endDate: { type: Date },

    terms: {
      type: String, // or use File model if you upload PDF
      default: "",
    },

    pdfFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
    },
    status: {
      type: String,
      enum: ["generated", "sent", "vendor_accepted", "vendor_rejected"],
      default: "generated",
    },

    vendorRemarks: { type: String },
    vendorResponseDate: Date,
  rejectionReason: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);