const db = require('../config/db');
const configureExpress = require('../config/express');
const configureSocket = require('../config/socket');
const registerRoutes = require('../routes');
const initCron = require('./cron');
module.exports = async ({ app, server }) => {
  await db();
  configureExpress(app);
  let io;
  if (process.env.NODE_ENV !== 'test') {
    io = configureSocket(server);
    app.set('io', io);
    initCron(io);
  } else {
    io = { emit: () => { }, to: () => ({ emit: () => { } }) };
    app.set('io', io);
  }
  registerRoutes(app);
  app.get('/health', (req, res) => res.status(200).send('ok'));
  app.use(require('../middlewares/404'));
  app.use(require('../middlewares/errorHandler'));
  return { io };
};
