const adminAuthService = require("../../services/admin/authService");
const statusCode = require("../../utils/statusCode");

exports.getAdminLogin = (req, res) => {
  if (req.cookies.adminToken) {
    return res.redirect("/admin/dashboard");
  }

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.render("admin/login", { layout: false, title: "Admin login - nexaBid" });
};

exports.postAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await adminAuthService.adminLogin(email, password);

    res.cookie("adminToken", result.token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
    return res.json({
      success: true,
      message: "Admin logged in successfully",
      redirectUrl: "/admin/dashboard",
    });
  } catch (err) {
    return res.json({
      success: false,
      message: err.message,
    });
  }
};

exports.adminLogout = (req, res) => {
  res.clearCookie("adminToken", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  res.setHeader("Cache-Control", "no-store");
  return res.redirect("/admin/login");
};

exports.getAdminDashboard = async (req, res) => {
  try {
    const stats = await adminAuthService.getDashboardStats();
    const activities = await adminAuthService.getRecentActivities();
    const tasks = await adminAuthService.getPendingTasks();
    console.log("📊 Dashboard Stats:", stats);
    console.log("📊 Dashboard Stats:", tasks);
    return res.render("admin/dahboard", {
      layout: "layouts/admin/adminLayout.ejs",
      title: "Admin Dashboard - NexaBid",
      stats,
      activities,
      tasks,
      currentPage: "dashboard",
    });
  } catch (err) {
    console.error("Admin dashboard Error:", err);
    return res.status(statusCode.INTERNAL_ERROR).send("server Error");
  }
};

exports.getUserManagement = async (req, res) => {
  try {
    const users = await adminAuthService.getAllUsers();

    return res.render("admin/userManagement", {
      layout: "layouts/admin/adminLayout",
      title: "User Management",
      users,
      currentPage: "user-management",
    });
  } catch (err) {
    console.error("User Management Error:", err);
    return res.status(statusCode.INTERNAL_ERROR).send("Server Error");
  }
};

exports.blockUser = async (req, res) => {
  try {
    await adminAuthService.blockUser(req.params.id, req);

    return res.json({
      success: true,
      message: "User Blocked Successfully",
    });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    await adminAuthService.unblockUser(req.params.id);

    return res.json({
      success: true,
      message: "User unblocked successfully",
    });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};
