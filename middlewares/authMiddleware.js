const jwt = require('jsonwebtoken');
const User = require('../models/user');

const protectRoute = async (req, res, next) => {
  console.log('➡️ protectRoute middleware triggered');

  try {
    const { token } = req.cookies;
    console.log('Token from cookies:', token);

    if (!token) return res.redirect('/auth/login');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const updatedUser = await User.findById(decoded.id).lean();

    if (!updatedUser) return res.redirect('/auth/login');

    if (decoded.role !== updatedUser.role) {
      const newToken = jwt.sign(
        { id: updatedUser._id, role: updatedUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('user_jwt', newToken, {
        httpOnly: true,
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    req.user = updatedUser;
    next();
  } catch (err) {
    console.log('protectRoute ERROR:', err.message);
    return res.redirect('/auth/login');
  }
};

const preventAuthPages = (req, res, next) => {
  console.log('➡️ preventAuthPages triggered');

  const { token } = req.cookies;
  const { adminToken } = req.cookies;
  console.log('Token from cookies:', token);

  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
      if (decoded.role === 'admin') {
        return res.redirect('/admin/dashboard');
      }
    } catch (err) {
      res.clearCookie(adminToken);
    }
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'user' || decoded.role === 'vendor') {
        return res.redirect('/auth/dashboard');
      }
    } catch (err) {
      res.clearCookie('token');
    }
  }

  next();
};
const isAuthenticated = (req, res, next) => {
  // If user already exists from Passport session -> OK
  if (req.user) {
    console.log('Auth: Passport session user');
    return next();
  }

  // Else check for JWT token
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    console.log('Auth: No token found');
    return res.redirect('/auth/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded user data to req
    console.log('Auth: JWT user');
    return next();
  } catch (err) {
    console.log('Auth: Invalid token', err.message);
    return res.redirect('/auth/login');
  }
};

const checkForgotOtp = (req, res, next) => {
  const { userId } = req.query;

  if (!userId || userId.trim() === '') {
    return res.redirect('/auth/forgot-password');
  }

  next();
};

const checkResetPassword = (req, res, next) => {
  const { userId, mode } = req.query;

  if (!userId || !mode) {
    return res.redirect('/auth/forgot-password');
  }

  next();
};
const nochache = function noCache(req, res, next) {
  console.log('nocache..hit');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

module.exports = {
  protectRoute,
  preventAuthPages,
  isAuthenticated,
  checkResetPassword,
  checkForgotOtp,
  nochache,
};
