const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = async (socket, next) => {
  try {
    const cookies = socket.handshake.headers.cookie || '';

    const token =
      cookies
        .split('; ')
        .find((c) => c.startsWith('token='))
        ?.split('=')[1] ||
      cookies
        .split('; ')
        .find((c) => c.startsWith('adminToken='))
        ?.split('=')[1];

    if (!token) return next(new Error('NO_TOKEN'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).lean();
    if (!user) return next(new Error('USER_NOT_FOUND'));

    socket.user = user;
    socket.isAdmin = user.role === 'admin'; // ✅ FIXED

    next();
  } catch (e) {
    next(new Error('INVALID_TOKEN'));
  }
};
