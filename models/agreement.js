const mongoose = require('mongoose');

const agreementSchema = new mongoose.Schema(
  {
    tenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tender',
      required: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    publisherAgreement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
    },

    uploadedByVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
    },

    approvedByPublisher: {
      type: Boolean,
      default: false,
    },

    publisherRemarks: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Agreement', agreementSchema);
