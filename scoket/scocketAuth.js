const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      return next(new Error('NO_COOKIE'));
    }

    const token = cookieHeader
      .split('; ')
      .find((c) => c.startsWith('token='))
      ?.split('=')[1];

    if (!token) {
      return next(new Error('NO_TOKEN'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).lean();

    if (!user) {
      return next(new Error('USER_NOT_FOUND'));
    }

    socket.user = user; 
    next();
  } catch (err) {
    return next(new Error('INVALID_TOKEN'));
  }
};
