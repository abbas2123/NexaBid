const mongoose = require('mongoose');
const ChatThread = require('../../models/chatThread');
const ChatMessage = require('../../models/chatMessage');

class ChatService {
  static async getOrCreateThread(me, other, type, relatedId) {
    let thread = await ChatThread.findOne({
      participants: { $all: [me, other] },
      $expr: { $eq: [{ $size: '$participants' }, 2] },
    });
    if (!thread) {
      thread = await ChatThread.create({
        participants: [me, other],
        relatedType: type,
        relatedId,
      });
    }

    return thread;
  }

  static async getInbox(userId) {
    const threads = await ChatThread.find({ participants: userId })
      .populate('participants', 'name avatar')
      .sort({ lastMessageAt: -1 });

    return threads.map((t) => {
      const other = t.participants.find((p) => p._id.toString() !== userId.toString());
      const unread = t.unreadCounts?.get(userId.toString()) || 0;
      return { ...t.toObject(), other, unread };
    });
  }

  static async getThread(threadId, userId) {
    const t = await ChatThread.findById(threadId).populate('participants', 'name avatar');
    if (!t) return null;

    const other = t.participants.find((p) => p._id.toString() !== userId.toString());

    await ChatService.markThreadRead(threadId, userId);

    return { ...t.toObject(), other };
  }

  static async getMessages(threadId) {
    return ChatMessage.find({ threadId })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: 1 });
  }

  static async send({ threadId, senderId, message, fileUrl, fileName, fileType }) {
    const msg = await ChatMessage.create({
      threadId,
      senderId,
      message,
      fileUrl,
      fileName,
      fileType,
      readBy: [senderId],
      deliveredTo: [],
    });

    const thread = await ChatThread.findById(threadId);
    if (thread) {
      thread.lastMessage = message || fileName || 'Attachment';
      thread.lastMessageAt = new Date();

      thread.participants.forEach((p) => {
        const key = p.toString();
        if (key === senderId.toString()) return;
        const current = thread.unreadCounts.get(key) || 0;
        thread.unreadCounts.set(key, current + 1);
      });

      await thread.save();
    }

    return msg;
  }

  static async markThreadDelivered(threadId, userId) {
    const tId = new mongoose.Types.ObjectId(threadId);
    const uId = new mongoose.Types.ObjectId(userId);

    await ChatMessage.updateMany(
      { threadId: tId, senderId: { $ne: uId }, deliveredTo: { $ne: uId } },
      { $addToSet: { deliveredTo: uId }, $set: { deliveredAt: new Date() } }
    );

    return ChatMessage.findOne({ threadId: tId }).sort({ createdAt: -1 }).lean();
  }

  static async markThreadRead(threadId, userId) {
    const tId = new mongoose.Types.ObjectId(threadId);
    const uId = new mongoose.Types.ObjectId(userId);

    const thread = await ChatThread.findById(tId);
    if (thread) {
      thread.unreadCounts.set(userId.toString(), 0);
      await thread.save();
    }

    await ChatMessage.updateMany(
      { threadId: tId, senderId: { $ne: uId }, deliveredTo: { $ne: uId } },
      { $addToSet: { deliveredTo: uId }, $set: { deliveredAt: new Date() } }
    );

    await ChatMessage.updateMany(
      { threadId: tId, senderId: { $ne: uId }, readBy: { $ne: uId } },
      { $addToSet: { readBy: uId }, $set: { readAt: new Date() } }
    );

    return ChatMessage.findOne({ threadId: tId }).sort({ createdAt: -1 }).lean();
  }
}

module.exports = ChatService;
