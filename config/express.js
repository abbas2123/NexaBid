const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const passport = require('./passport');

const nocache = require('../middlewares/noCache');
const rateLimiter = require('../middlewares/rateLimiter');
const setLocals = require('../middlewares/setLocals');
const authUser = require('../middlewares/authUser');

module.exports = (app) => {
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../views'));
  app.use(expressLayouts);

  // 1️⃣ Parsers
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());

  // 2️⃣ Session first
  app.use(
    session({
      secret: process.env.SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 1000 * 60 * 60 * 24 },
    }),
  );

  // 3️⃣ Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // 4️⃣ Auth Context
  app.use(authUser);

  // 5️⃣ View locals
  app.use(setLocals);

  // 6️⃣ Security
  app.use(nocache);
  app.use(rateLimiter);

  // 7️⃣ Static
  app.use(express.static(path.join(__dirname, '../public')));
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
};
