module.exports = (io, socket) => {
    const userId = socket.user?._id?.toString();

    socket.on('typing', ({ threadId }) => {
        if (!userId || !threadId) return;
        const room = `chat_${threadId}`;
        socket.to(room).emit('userTyping', { userId });
    });

    socket.on('stop_typing', ({ threadId }) => {
        if (!userId || !threadId) return;
        const room = `chat_${threadId}`;
        socket.to(room).emit('userStopTyping', { userId });
    });
};
