const rateLimit = require('express-rate-limit');
const statusCode = require('../utils/statusCode');
const { LAYOUTS, VIEWS } = require('../utils/constants');

module.exports = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(statusCode.TOO_MANY_REQUESTS || 429).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: '⚠️ Too many requests. Please wait 1 minute.',
      user: req.user,
    });
  },
});
