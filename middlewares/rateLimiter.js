const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).render('error', {
      layout: 'layouts/user/userLayout',
      message: '⚠️ Too many requests. Please wait 1 minute.',
      user: req.user,
    });
  },
});
