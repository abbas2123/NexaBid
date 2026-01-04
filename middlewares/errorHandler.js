const multer = require('multer');
const statusCode = require('../utils/statusCode');

module.exports = (err, req, res, _next) => {
  console.error('🔥 GLOBAL ERROR HANDLER:', err);

  if (err instanceof multer.MulterError) {
    return res.status(statusCode.BAD_REQUEST).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.message || 'Upload error',
    });
  }

  return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: err.message || 'Server Error',
  });
};
