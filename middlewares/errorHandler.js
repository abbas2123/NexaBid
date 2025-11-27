module.exports = (err, req, res, next) => {
  console.error("🔥 GLOBAL ERROR HANDLER:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // If request is AJAX / API → return JSON
  if (req.xhr || req.originalUrl.includes("/api")) {
    return res.status(statusCode).json({
      success: false,
      status: statusCode,
      message,
    });
  }

  // Default → render a styled error page
  return res.status(statusCode).render("error", {
    layout: false,
    title: "Error",
    statusCode,
    message
  });
};