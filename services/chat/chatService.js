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

  static async send({ threadId, senderId, message, fileUrl, fileName, fileType }, io) {
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

    await ChatThread.findByIdAndUpdate(threadId, {
      lastMessage: message || fileName || 'Attachment',
      lastMessageAt: new Date(),
    });

    const thread = await ChatThread.findById(threadId);
    if (thread) {
      const otherParticipants = thread.participants.filter(
        (p) => p.toString() !== senderId.toString()
      );
      for (const p of otherParticipants) {
        const key = `unreadCounts.${p.toString()}`;
        await ChatThread.findByIdAndUpdate(threadId, { $inc: { [key]: 1 } });
      }
    }

    if (io) {
      const fullMsg = await ChatMessage.findById(msg._id).populate('senderId', 'name avatar');

      io.to(`chat_${threadId}`).emit('new_message', {
        ...fullMsg.toObject(),
        _silentFor: fileUrl ? senderId.toString() : null,
      });

      if (thread) {
        const socketsFn = io.in(`chat_${threadId}`).fetchSockets
          ? io.in(`chat_${threadId}`).fetchSockets()
          : [];
        const sockets = await socketsFn;
        const onlineUsersInRoom = sockets.map((s) => s.user?._id?.toString()).filter(Boolean);

        thread.participants.forEach((p) => {
          const userIdStr = p.toString();
          if (userIdStr !== senderId.toString() && !onlineUsersInRoom.includes(userIdStr)) {
            io.to(userIdStr).emit('newNotification', {
              type: 'message',
              threadId,
              message: `New message from ${fullMsg.senderId.name}`,
            });
          }
        });
      }
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

    return true;
  }

  static async markThreadRead(threadId, userId) {
    const tId = new mongoose.Types.ObjectId(threadId);
    const uId = new mongoose.Types.ObjectId(userId);

    const key = `unreadCounts.${userId.toString()}`;
    await ChatThread.findByIdAndUpdate(tId, { $set: { [key]: 0 } });

    await ChatMessage.updateMany(
      { threadId: tId, senderId: { $ne: uId }, readBy: { $ne: uId } },
      {
        $addToSet: { readBy: uId },
        $set: { readAt: new Date() },
      }
    );

    return true;
  }

  static async getUnreadCount(userId) {
    const threads = await ChatThread.find({ participants: userId });
    let totalUnread = 0;
    threads.forEach((thread) => {
      totalUnread += thread.unreadCounts?.get(userId.toString()) || 0;
    });
    return totalUnread;
  }
}

module.exports = ChatService;
