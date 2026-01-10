const mongoose = require('mongoose');

const propertyParticipantSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    participationPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

propertyParticipantSchema.index({ propertyId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('PropertyParticipant', propertyParticipantSchema);
