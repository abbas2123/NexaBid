const rateLimit = require('express-rate-limit');
const statusCode = require('../utils/statusCode');
const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../utils/constants');

module.exports = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(statusCode.TOO_MANY_REQUESTS || 429).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.TOO_MANY_REQUESTS,
      user: req.user,
    }),
});
