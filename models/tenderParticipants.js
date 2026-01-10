const mongoose = require('mongoose');

const tenderParticipantSchema = new mongoose.Schema(
  {
    tenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tender',
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    participationPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },

    status: {
      type: String,
      enum: ['active', 'cancelled', 'banned'],
      default: 'active',
    },
  },
  { timestamps: true }
);

tenderParticipantSchema.index({ tenderId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('TenderParticipant', tenderParticipantSchema);
