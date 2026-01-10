const db = require('../config/db');
const configureExpress = require('../config/express');
const configureSocket = require('../config/socket');
const registerRoutes = require('../routes');
const initCron = require('./cron');

module.exports = async ({ app, server }) => {
  // 1. Connect to Database
  await db();
  console.log('Using centralized loaders...');

  // 2. Configure Express (Middleware, Views, etc.)
  configureExpress(app);

  // 3. Configure Socket.io
  const io = configureSocket(server);
  app.set('io', io);

  // 4. Initialize Cron Jobs
  initCron(io);

  // 5. Register Routes
  registerRoutes(app);

  // 6. Error Handling (Must be last)
  app.use(require('../middlewares/404'));
  app.use(require('../middlewares/errorHandler'));

  return { io };
};
