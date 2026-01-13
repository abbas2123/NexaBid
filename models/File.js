const mongoose = require('mongoose');
const fileSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    relatedType: { type: String },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    fileName: String,
    fileUrl: String,
    checksum: String,
    mimeType: String,
    size: Number,
    version: { type: Number, default: 1 },
    metadata: { type: Object, default: {} },
  },
  { timestamps: { createdAt: 'uploadedAt' } }
);
fileSchema.index({ relatedType: 1, relatedId: 1 });
fileSchema.index({ checksum: 1 });
module.exports = mongoose.model('File', fileSchema);
