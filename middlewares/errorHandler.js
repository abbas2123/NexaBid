const statusCode = require("../utils/statusCode");

module.exports = (err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR HANDLER:", err);

 
  if (err instanceof require("multer").MulterError) {
    return res.status(statusCode.BAD_REQUEST).json({
      success: false,
      message: err.code === "LIMIT_FILE_SIZE"
        ? "File too large"
        : err.message || "Upload error",
    });
  }

  // 2️⃣ Normal error fallback
  return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: err.message || "Server Error",
  });
};