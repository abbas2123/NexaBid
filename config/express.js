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
const morgan = require('morgan');
const logger = require('../utils/logger');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const mongoose = require('mongoose');

module.exports = (app) => {
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../views'));
  app.use(expressLayouts);
  app.use(helmet({ contentSecurityPolicy: false }));


  // HTTP Logger (Morgan + Winston)
  const morganFormat = process.env.NODE_ENV === 'development' ? 'dev' : 'combined';
  app.use(
    morgan(morganFormat, {
      stream: {
        write: (message) => logger.http(message.trim()),
      },
      skip: (req, _res) => req.url.startsWith('/uploads/'), // Skip logging large file uploads/static assets
    })
  );

  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  app.use(

    session({
      secret: process.env.SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
        dbName: 'NexaBid',
        ttl: 14 * 24 * 60 * 60, // 14 days
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    })
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
      '/vendor/apply',
      '/chat/thread/',
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
