const multer = require('multer');
const statusCode = require('../utils/statusCode');
const { LAYOUTS, TITLES } = require('../utils/constants');
const logger = require('../utils/logger');


module.exports = (err, req, res, _next) => {
  console.error('🔥 GLOBAL ERROR HANDLER:', err);
  const statusCodeVal = err.statusCode || statusCode.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Server Error';
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('⚠️ CSRF Error:', {
      message: err.message,
      url: req.originalUrl,
      method: req.method,
      referer: req.headers.referer,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    const paymentId = req.body?.paymentId || req.query?.paymentId || req.params?.paymentId;
    if (paymentId) {
      return res.redirect(`/payments/failure/${paymentId}?reason=Session+Expired+or+Invalid+Token.+Please+try+again.`);
    }

    if (req.headers.accept && req.headers.accept.includes('html')) {
      // Redirect to login or home with a clear message instead of a blank error page
      return res.status(403).send(`
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        <script>
          window.onload = function() {
            Swal.fire({
              icon: 'error',
              title: 'Session Expired',
              text: 'Your security token has expired or is invalid. Please refresh the page and try again.',
              confirmButtonText: 'Reload Page'
            }).then(() => {
              window.location.reload();
            });
          };
        </script>
      `);
    }
    return res.status(403).json({ success: false, message: 'Session expired or invalid CSRF token. Please refresh.' });
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
