const mongoose = require('mongoose');
const vendorProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
    businessName: { type: String, required: true },
    address: { type: String },
    contacts: [
      {
        name: String,
        phone: String,
        email: String,
      },
    ],
  },
  { timestamps: true }
);
vendorProfileSchema.index({ userId: 1 }, { unique: true });
module.exports = mongoose.model('VendorProfile', vendorProfileSchema);
