const auctionSocket = require('./auctionSocket');
const chatSocket = require('./chatSocket');
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.user?.name || socket.user?._id || 'Unknown User');

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
  });
};
