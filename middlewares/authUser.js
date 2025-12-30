const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).lean();
  } catch (err) {
    req.user = null;
  }
  next();
};
