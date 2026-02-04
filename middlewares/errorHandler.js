const multer = require('multer');
const statusCode = require('../utils/statusCode');
const { LAYOUTS, TITLES } = require('../utils/constants');


module.exports = (err, req, res, _next) => {
  console.error('🔥 GLOBAL ERROR HANDLER:', err);
  const statusCodeVal = err.statusCode || statusCode.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Server Error';
  if (err.code === 'EBADCSRFTOKEN') {
    console.warn('⚠️ CSRF Error:', err.message);

    const paymentId = req.body?.paymentId || req.query?.paymentId || req.params?.paymentId;
    if (paymentId) {
      return res.redirect(`/payments/failure/${paymentId}?reason=Session+Expired+or+Invalid+Token.+Please+try+again.`);
    }

    if (req.headers.accept && req.headers.accept.includes('html')) {
      return res.status(403).send('<h1>Session Expired</h1><p>Your session has expired or the form token is invalid. Please refresh the page and try again.</p>');
    }
    return res.status(403).json({ success: false, message: 'Session expired or invalid CSRF token' });
  }

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
