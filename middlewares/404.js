const statusCode = require('../utils/statusCode');
const { LAYOUTS } = require('../utils/constants');

module.exports = (req, res) => {
  res.status(statusCode.NOT_FOUND).render('404', {
    layout: LAYOUTS.USER_LAYOUT,
    message: 'The page you are looking for does not exist.',
    user: req.user,
  });
};
