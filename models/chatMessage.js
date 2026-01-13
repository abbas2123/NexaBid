const mongoose = require('mongoose');
const { Schema } = mongoose;
const ChatMessageSchema = new Schema(
  {
    threadId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatThread',
      required: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deliveredAt: { type: Date },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    readAt: { type: Date },
  },
  { timestamps: true }
);
ChatMessageSchema.index({ threadId: 1, createdAt: -1 });
module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
