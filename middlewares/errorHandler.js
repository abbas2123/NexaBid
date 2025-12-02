module.exports = (err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR HANDLER:", err);

  // 1️⃣ Handle Multer errors properly
  if (err instanceof require("multer").MulterError) {
    return res.status(400).json({
      success: false,
      message: err.code === "LIMIT_FILE_SIZE"
        ? "File too large"
        : err.message || "Upload error",
    });
  }

  // 2️⃣ Normal error fallback
  return res.status(500).json({
    success: false,
    message: err.message || "Server Error",
  });
};