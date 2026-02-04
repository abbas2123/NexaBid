const auctionSocket = require('./auctionSocket');
const chatSocket = require('./chatSocket');
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.user?.name || socket.user?._id || 'Unknown User');
    const userId = socket.user?._id?.toString();
    if (userId) {
      const User = require('../models/user');
      User.findByIdAndUpdate(userId, { isOnline: true }).catch(console.error);

      // Notify all chat rooms this user is in
      // This part is tricky because we don't know the rooms yet.
      // We'll broadcast a global user_status that clients can use to update.
      io.emit('user_status', { userId, isOnline: true });
    }

    socket.on('joinUser', (userId) => {
      if (userId.toString() !== socket.user?._id.toString()) {
        console.warn(`Security: User ${socket.user?._id} tried to join room ${userId}`);
        return;
      }
      socket.join(userId.toString());
      console.log(`User joined personal room: ${userId}`);
    });
    auctionSocket(io, socket);
    chatSocket(io, socket);

    socket.on('disconnect', async () => {
      if (userId) {
        const User = require('../models/user');
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen }).catch(console.error);
        io.emit('user_status', { userId, isOnline: false, lastSeen });
      }
    });
  });
};
