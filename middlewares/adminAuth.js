const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { ERROR_MESSAGES } = require('../utils/constants');
exports.adminProtect = async (req, res, next) => {
  const token = req.cookies.adminToken;
  if (!token) return res.redirect('/admin/login');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    const admin = await User.findById(decoded.id).lean();
    if (!admin) throw new Error(ERROR_MESSAGES.ADMIN_NOT_FOUND);
    req.admin = admin;
    next();
  } catch (err) {
    res.clearCookie('adminToken');
    return res.redirect('/admin/login');
  }
};
exports.preventAdminBack = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};
