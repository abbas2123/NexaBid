const auctionSocket = require('./auctionSocket');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.user.name);
    auctionSocket(io, socket);
  });
};
