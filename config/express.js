const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const passport = require('./passport');
const nocache = require('../middlewares/noCache');
const rateLimiter = require('../middlewares/rateLimiter');
const setLocals = require('../middlewares/setLocals');
const helmet = require('helmet');
const csrf = require('csurf');
const authUser = require('../middlewares/authUser');
const adminUser = require('../middlewares/adminUser');

module.exports = (app) => {
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../views'));
  app.use(expressLayouts);

  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use(
    session({
      secret: process.env.SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  const csrfProtection = csrf();

  app.use((req, res, next) => {
    const excludedRoutes = [
      '/payments/confirm',
      '/payments/razorpay-webhook',
      '/payments/mark-failed',
      '/wallet/api/verify-payment',
      '/socket.io',
      '/vendor/tender/upload',
    ];

    const isExcluded = excludedRoutes.some((route) =>
      req.originalUrl.startsWith(route),
    );

    if (isExcluded || process.env.NODE_ENV === 'test') {
      return next();
    }
    csrfProtection(req, res, next);
  });

  app.use(authUser);
  app.use(adminUser);

  app.use((req, res, next) => {
    if (typeof req.csrfToken === 'function') {
      res.locals.csrfToken = req.csrfToken();
    } else {
      res.locals.csrfToken = null;
    }
    next();
  });

  app.use(setLocals);
  app.use(nocache);
  app.use(rateLimiter);
  app.use(express.static(path.join(__dirname, '../public')));
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
};
