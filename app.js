const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
require("dotenv").config({ path: envFile });
const express = require('express');
const http = require('http');
const initLoaders = require('./loaders');

async function startApp() {
  const app = express();
  const server = http.createServer(app);
  await initLoaders({ app, server });
  app.get('/health', (req, res) => res.status(200).send('ok'));

  const PORT = process.env.PORT || 3000;

  
  if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 Server running');
      console.log(`➡ Local: http://localhost:${PORT}`);
    });
  }

  return { app, server };
}


if (require.main === module) {
  startApp().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = startApp;
