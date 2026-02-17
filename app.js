const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
require("dotenv").config({ path: envFile });
const express = require('express');
const http = require('http');
const initLoaders = require('./loaders');

const logger = require('./utils/logger');


async function startApp() {
  require('./config/env');

  const app = express();
  const server = http.createServer(app);

  await initLoaders({ app, server });
  app.get('/health', (req, res) => res.status(200).send('ok'));

  const PORT = process.env.PORT || 3000;

  if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`
      ################################################
      🛡️  Server listening on port: ${PORT} 🛡️
      ################################################
      `);
    });
  }

  const gracefulShutdown = () => {
    logger.info('Received kill signal, shutting down gracefully');
    server.close(() => {
      logger.info('Closed out remaining connections');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return { app, server };
}

if (require.main === module) {
  startApp().catch(err => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = startApp;
