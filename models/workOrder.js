const mongoose = require('mongoose');

const workOrderSchema = new mongoose.Schema(
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

    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // publisher
      required: true,
    },

    woNumber: {
      type: String,
      unique: true,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    pdfFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
    },

    startDate: Date,
    endDate: Date,

    status: {
      type: String,
      enum: ['issued', 'in_progress', 'completed', 'closed'],
      default: 'issued',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkOrder', workOrderSchema);
