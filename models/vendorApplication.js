
const mongoose = require("mongoose");

const vendorApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  businessName: { type: String },
  panNumber: { type: String },
  gstNumber: { type: String },
  documents: [
    {
      fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File",required:true },
      type: {type:String,default:'unknown'},
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  ocrResultId: { type: mongoose.Schema.Types.ObjectId, ref: "OCRResult", default: null },
  fraudFlags: { type: Array, default: [] },
  status: {
    type: String,
    enum: ["pending","submitted", "approved", "rejected"],
    default: "pending"
  },
  adminNote: { type: String, default: null },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

vendorApplicationSchema.index({ userId: 1 });
vendorApplicationSchema.index({ status: 1 });

module.exports = mongoose.model("VendorApplication", vendorApplicationSchema);