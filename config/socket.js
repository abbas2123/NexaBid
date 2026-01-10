const { Server } = require('socket.io');
const socketAuth = require('../socket/socketAuth');

module.exports = (server) => {
  const io = require('socket.io')(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(socketAuth);

  require('../socket/index')(io);

  return io;
};
