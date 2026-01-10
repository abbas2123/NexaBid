


const mongoose = require('mongoose');

const ocrResultSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      required: true,
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    extracted: { type: Object }, 
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'processed',
    },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OCRResult', ocrResultSchema);
