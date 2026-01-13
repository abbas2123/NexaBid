const adminAuthService = require('../../services/admin/authService');
const statusCode = require('../../utils/statusCode');
const {
  VIEWS,
  REDIRECTS,
  SUCCESS_MESSAGES,
  LAYOUTS,
  ERROR_MESSAGES,
  TITLES,
} = require('../../utils/constants');
exports.getAdminLogin = (req, res) => {
  if (req.cookies.adminToken) {
    return res.redirect(REDIRECTS.ADMIN_DASHBOARD);
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.render(VIEWS.ADMIN_LOGIN, {
    layout: false,
    title: TITLES.ADMIN_LOGIN,
  });
};
exports.postAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await adminAuthService.adminLogin(email, password);
    res.cookie('adminToken', result.token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
    return res.json({
      success: true,
      message: SUCCESS_MESSAGES.ADMIN_LOGIN_SUCCESS,
      redirectUrl: REDIRECTS.ADMIN_DASHBOARD,
    });
  } catch (err) {
    return res.json({
      success: false,
      message: err.message,
    });
  }
};
exports.adminLogout = (req, res) => {
  res.clearCookie('adminToken', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  });
  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(REDIRECTS.ADMIN_LOGIN);
};
exports.getAdminDashboard = async (req, res) => {
  try {
    const filters = {
      timeframe: req.query.timeframe || 'weekly',
      category: req.query.category || 'all',
      year: req.query.year || null,
      month: req.query.month || null,
    };
    const stats = await adminAuthService.getDashboardStats(filters);
    const activities = await adminAuthService.getRecentActivities();
    const tasks = await adminAuthService.getPendingTasks();
    return res.render(VIEWS.ADMIN_DASHBOARD, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      title: TITLES.ADMIN_DASHBOARD,
      stats,
      activities,
      tasks,
      applied: filters,
      currentPage: 'dashboard',
    });
  } catch (err) {
    console.error('Admin dashboard Error:', err);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
exports.getUserManagement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const filter = {
      search: req.query.search || '',
      role: req.query.role || '',
      status: req.query.status || '',
    };
    const users = await adminAuthService.getAllUsers(page, filter);
    return res.render(VIEWS.ADMIN_USER_MANAGEMENT, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      title: TITLES.USER_MANAGEMENT,
      users: users.users,
      pagination: users.pagination,
      applied: filter,
      currentPage: 'user-management',
    });
  } catch (err) {
    console.error('User Management Error:', err);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
exports.blockUser = async (req, res) => {
  try {
    await adminAuthService.blockUser(req.params.id, req);
    return res.json({
      success: true,
      message: SUCCESS_MESSAGES.USER_BLOCKED,
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
      message: SUCCESS_MESSAGES.USER_UNBLOCKED,
    });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};
