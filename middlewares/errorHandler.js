const multer = require('multer');
const statusCode = require('../utils/statusCode');
const { LAYOUTS, TITLES } = require('../utils/constants');
module.exports = (err, req, res, _next) => {
  console.error('🔥 GLOBAL ERROR HANDLER:', err);
  const statusCodeVal = err.statusCode || statusCode.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Server Error';
  if (req.headers.accept && req.headers.accept.indexOf('html') !== -1) {
    const isAdminRoute = req.originalUrl.startsWith('/admin');
    const layout = isAdminRoute ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT;
    return res.status(statusCodeVal).render('500', {
      layout: layout,
      title: TITLES.SERVER_ERROR || 'Server Error',
      message: message,
      user: req.user || req.admin || null,
      currentPage: 'error',
    });
  }
  if (err instanceof multer.MulterError) {
    return res.status(statusCode.BAD_REQUEST).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.message || 'Upload error',
    });
  }
  return res.status(statusCodeVal).json({
    success: false,
    message: message,
  });
};
