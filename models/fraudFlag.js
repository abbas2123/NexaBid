

const mongoose = require('mongoose');

const fraudFlagSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    flags: { type: Array },
    severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FraudFlag', fraudFlagSchema);
