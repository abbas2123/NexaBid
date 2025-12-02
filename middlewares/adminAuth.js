const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.adminProtect = (req, res, next) => {
  const token = req.cookies.adminToken;
  if (!token) return res.redirect("/admin/login");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      res.clearCookie("adminToken");
      return res.redirect("/admin/login");
    }
    req.admin = decoded;
    next();
  } catch (err) {
    res.clearCookie("adminToken");
    return res.redirect("/admin/login");
  }
};
// Prevent back-button from accessing admin dashboard
exports.preventAdminBack = (req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};
