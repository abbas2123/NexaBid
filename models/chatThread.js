

const mongoose = require('mongoose');

const { Schema } = mongoose;

const ChatThreadSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],

    relatedType: { type: String },
    relatedId: { type: Schema.Types.ObjectId },

    lastMessage: { type: String },
    lastMessageAt: { type: Date },

    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

ChatThreadSchema.index({ participants: 1 });
ChatThreadSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model('ChatThread', ChatThreadSchema);
