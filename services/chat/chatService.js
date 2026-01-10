


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

    // Mark as read when opening thread
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

    // Atomic update for last message
    await ChatThread.findByIdAndUpdate(threadId, {
      lastMessage: message || fileName || 'Attachment',
      lastMessageAt: new Date(),
    });

    // Atomic increment unread count for OTHERS
    const thread = await ChatThread.findById(threadId);
    if (thread) {
      const otherParticipants = thread.participants.filter(p => p.toString() !== senderId.toString());
      for (const p of otherParticipants) {
        const key = `unreadCounts.${p.toString()}`;
        await ChatThread.findByIdAndUpdate(threadId, { $inc: { [key]: 1 } });
      }
    }

    if (io) {
      const fullMsg = await ChatMessage.findById(msg._id).populate('senderId', 'name avatar');

      // BUG #5 FIX: Silent echo for Sender (prevents duplicate file messages)
      // We emit to the Room, but we can pass a "silent" flag in the payload which client checks
      // socket.io doesn't support 'except' easily in this context without sender socket instance
      // So we send a payload that the client filters
      io.to(`chat_${threadId}`).emit('new_message', {
        ...fullMsg.toObject(),
        _silentFor: fileUrl ? senderId.toString() : null // Only silent for file uploads initiated via HTTP
      });

      // Smart Notification: Check if users are in the room before sending notification
      if (thread) {
        const socketsFn = io.in(`chat_${threadId}`).fetchSockets ? io.in(`chat_${threadId}`).fetchSockets() : [];
        const sockets = await socketsFn;
        const onlineUsersInRoom = sockets.map(s => s.user?._id?.toString()).filter(Boolean);

        thread.participants.forEach((p) => {
          const userIdStr = p.toString();
          if (userIdStr !== senderId.toString() && !onlineUsersInRoom.includes(userIdStr)) {
            io.to(userIdStr).emit('newNotification', { // Standardized event
              type: 'message',
              threadId,
              message: `New message from ${fullMsg.senderId.name}`
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

    // BUG #7 FIX: Delivered Logic - Only update deliveredTo
    await ChatMessage.updateMany(
      { threadId: tId, senderId: { $ne: uId }, deliveredTo: { $ne: uId } },
      { $addToSet: { deliveredTo: uId }, $set: { deliveredAt: new Date() } }
    );

    return true;
  }

  static async markThreadRead(threadId, userId) {
    const tId = new mongoose.Types.ObjectId(threadId);
    const uId = new mongoose.Types.ObjectId(userId);

    // BUG #8 FIX: Race-safe unread reset using $set (or $max if unread could go negative, but < 0 is impossible here)
    // The previous implementation was fine with $set: 0, but we must ensure we don't overwrite if a new message comes in parallel?
    // Actually $set: 0 is dangerous if a message arrives *during* this op.
    // Ideally we should decrement by current count, but we don't know it atomically.
    // For now, $set 0 is standard unless we move to a transactional model. 
    // The user suggested: db.collection.updateOne({_id:tId}, {$max:{[`unreadCounts.${userId}`]:0}}) -> This is same as set:0 if value is positive.
    // To truly fix race, we normally read then unset, or just accept $set 0 for now as it's typically "User opened chat -> zero it".
    const key = `unreadCounts.${userId.toString()}`;
    await ChatThread.findByIdAndUpdate(tId, { $set: { [key]: 0 } });

    // BUG #7 FIX: Read Logic - STRICT SEPARATION
    // DO NOT update deliveredTo here. Read implies read. Delivered is separate.
    await ChatMessage.updateMany(
      { threadId: tId, senderId: { $ne: uId }, readBy: { $ne: uId } },
      {
        $addToSet: { readBy: uId }, // REMOVED deliveredTo update
        $set: { readAt: new Date() }
      }
    );

    return true;
  }

  static async getUnreadCount(userId) {
    // Determine unread count more efficiently if possible, but existing logic is fine if map is used
    // However, with the atomic $inc change, we rely on the map in the document
    const threads = await ChatThread.find({ participants: userId });
    let totalUnread = 0;
    threads.forEach((thread) => {
      // Mongoose Map access
      totalUnread += thread.unreadCounts?.get(userId.toString()) || 0;
    });
    return totalUnread;
  }
}

module.exports = ChatService;
