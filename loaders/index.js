const db = require('../config/db');
const configureExpress = require('../config/express');
const configureSocket = require('../config/socket');
const registerRoutes = require('../routes');
const initCron = require('./cron');
module.exports = async ({ app, server }) => {
  await db();
  console.log('Using centralized loaders...');
  configureExpress(app);
  const io = configureSocket(server);
  app.set('io', io);
  initCron(io);
  registerRoutes(app);
  app.use(require('../middlewares/404'));
  app.use(require('../middlewares/errorHandler'));
  return { io };
};
