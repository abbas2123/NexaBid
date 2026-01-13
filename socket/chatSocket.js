const ChatService = require('../services/chat/chatService');
const ChatThread = require('../models/chatThread');
const rateLimit = {};
module.exports = (io, socket) => {
  const userId = socket.user?._id?.toString();
  socket.on('send_message', async ({ threadId, message }) => {
    if (!userId || !message) return;
    const now = Date.now();
    if (rateLimit[userId] && now - rateLimit[userId] < 300) {
      console.warn(`Rate limit exceeded for user ${userId}`);
      return;
    }
    rateLimit[userId] = now;
    try {
      const thread = await ChatThread.findById(threadId);
      if (!thread) return;
      const isParticipant = thread.participants.some((p) => p.toString() === userId);
      if (!isParticipant) {
        console.warn(`Security: User ${userId} tried to send to unauthorized thread ${threadId}`);
        return;
      }
      await ChatService.send(
        {
          threadId,
          senderId: userId,
          message,
        },
        io
      );
    } catch (err) {
      console.error('Socket send message error:', err);
    }
  });
  socket.on('join_chat', async ({ threadId }) => {
    if (!userId || !threadId) return;
    const thread = await ChatThread.findById(threadId);
    if (!thread) return;
    const isParticipant = thread.participants.some((p) => p.toString() === userId);
    if (!isParticipant) {
      console.warn(`User ${userId} tried to join unauthorized thread ${threadId}`);
      return;
    }
    const room = `chat_${threadId}`;
    socket.join(room);
    await ChatService.markThreadDelivered(threadId, userId);
    socket.to(room).emit('messages_delivered', {
      threadId,
      deliveredBy: userId,
    });
  });
  socket.on('mark_read', async ({ threadId }) => {
    if (!userId || !threadId) return;
    await ChatService.markThreadRead(threadId, userId);
    const room = `chat_${threadId}`;
    io.to(room).emit('messages_seen', {
      threadId,
      seenBy: userId,
    });
  });
  socket.on('leave_chat', ({ threadId }) => {
    const room = `chat_${threadId}`;
    socket.leave(room);
  });
  socket.on('typing', ({ threadId }) => {
    const room = `chat_${threadId}`;
    socket.to(room).emit('typing', { userId });
  });
  socket.on('stop_typing', ({ threadId }) => {
    const room = `chat_${threadId}`;
    socket.to(room).emit('stop_typing', { userId });
  });
  socket.on('disconnecting', () => {
    const rooms = socket.rooms;
    rooms.forEach((room) => {
      if (room.startsWith('chat_')) {
        socket.to(room).emit('stop_typing', { userId });
      }
    });
  });
};
