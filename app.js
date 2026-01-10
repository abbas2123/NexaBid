require('dotenv').config();
const express = require('express');
const http = require('http');

const initLoaders = require('./loaders');

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Initialize all loaders
  await initLoaders({ app, server });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Server running');
    console.log(`➡ Local: http://localhost:${PORT}`);
  });
}

startServer();
