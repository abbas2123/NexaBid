const ChatService = require('../services/chat/chatService');
const ChatThread = require('../models/chatThread');

const rateLimit = {}; // Simple in-memory rate limiter

module.exports = (io, socket) => {
    const userId = socket.user?._id?.toString();

    // BUG #1 FIX: Security - Verify Sender
    socket.on('send_message', async ({ threadId, message }) => {
        if (!userId || !message) return;

        // Rate Limiting (300ms)
        const now = Date.now();
        if (rateLimit[userId] && now - rateLimit[userId] < 300) {
            console.warn(`Rate limit exceeded for user ${userId}`);
            return;
        }
        rateLimit[userId] = now;

        try {
            // Verify participation
            const thread = await ChatThread.findById(threadId);
            if (!thread) return;
            const isParticipant = thread.participants.some(p => p.toString() === userId);
            if (!isParticipant) {
                console.warn(`Security: User ${userId} tried to send to unauthorized thread ${threadId}`);
                return;
            }

            await ChatService.send({
                threadId,
                senderId: userId,
                message,
            }, io);
        } catch (err) {
            console.error('Socket send message error:', err);
        }
    });

    socket.on('join_chat', async ({ threadId }) => {
        if (!userId || !threadId) return;

        // BUG #6 FIX: Security Check
        const thread = await ChatThread.findById(threadId);
        if (!thread) return;

        // Ensure user is participant
        const isParticipant = thread.participants.some(p => p.toString() === userId);
        if (!isParticipant) {
            console.warn(`User ${userId} tried to join unauthorized thread ${threadId}`);
            return;
        }

        const room = `chat_${threadId}`;

        // BUG #9 FIX: Leave other rooms? (Client should handle, but good to ensure uniqueness)
        // socket.leaveAll() might be too aggressive, rely on client 'leave_chat' or strict room management
        // For now, simple join is standard.
        socket.join(room);

        // BUG #3 FIX: Trigger Delivered
        await ChatService.markThreadDelivered(threadId, userId);

        // Broadcast delivered status to *other* users in the room (so they see double ticks)
        socket.to(room).emit('messages_delivered', {
            threadId,
            deliveredBy: userId
        });
    });

    // BUG #2 FIX: Mark Read Listener
    socket.on('mark_read', async ({ threadId }) => {
        if (!userId || !threadId) return;

        await ChatService.markThreadRead(threadId, userId);

        // Broadcast seen status
        const room = `chat_${threadId}`;
        io.to(room).emit('messages_seen', {
            threadId,
            seenBy: userId
        });
    });

    // BUG #9 FIX: Room Leak
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

    // BUG #4 FIX: Typing Stuck on Disconnect
    socket.on('disconnecting', () => {
        const rooms = socket.rooms;
        rooms.forEach((room) => {
            if (room.startsWith('chat_')) {
                socket.to(room).emit('stop_typing', { userId });
            }
        });
    });
};
