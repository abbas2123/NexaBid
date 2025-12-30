require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const session = require('express-session');
const passport = require('./config/passport');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const cron = require('node-cron');

const db = require('./config/db');
const registerRoutes = require('./index');
const auctionUpdates = require('./cron/auctionUpdate');
const errorHandler = require('./middlewares/errorHandler');
const authUser = require('./middlewares/authUser');
const nocache = require('./middlewares/noCache');
const rateLimiter = require('./middlewares/rateLimiter');
const setLocals = require('./middlewares/setLocals');
const notFound = require('./middlewares/404');
const socketAuth = require('./scoket/scocketAuth');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
});

io.use(socketAuth);
app.set('io', io);
require('./scoket/index')(io);

let cronRunning = false;

cron.schedule('*/30 * * * * *', async () => {
  if (cronRunning) return;
  cronRunning = true;

  try {
    await auctionUpdates(io);
  } catch (err) {
    console.error(err);
  } finally {
    cronRunning = false;
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(nocache);

db();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(authUser);
app.use(setLocals);
app.use(rateLimiter);

registerRoutes(app);

app.use(notFound);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running`);
  console.log(`➡ Local: http://localhost:${PORT}`);
});
