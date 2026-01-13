const statusCode = require('../utils/statusCode');
const { LAYOUTS, ERROR_MESSAGES } = require('../utils/constants');
module.exports = (req, res) => {
  const isAdminRoute = req.originalUrl.startsWith('/admin');
  const layout = isAdminRoute ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT;
  res.status(statusCode.NOT_FOUND).render('404', {
    layout: layout,
    message: ERROR_MESSAGES.PAGE_NOT_FOUND,
    user: req.user || req.admin,
    currentPage: 'error',
  });
};
