const statusCode = require('../utils/statusCode');
const { LAYOUTS, ERROR_MESSAGES } = require('../utils/constants');

module.exports = (req, res) => {
  res.status(statusCode.NOT_FOUND).render('404', {
    layout: LAYOUTS.USER_LAYOUT,
    message: ERROR_MESSAGES.PAGE_NOT_FOUND,
    user: req.user,
  });
};
