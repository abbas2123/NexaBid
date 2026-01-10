const cron = require('node-cron');
const auctionUpdates = require('../cron/auctionUpdate');

module.exports = (io) => {
  let cronRunning = false;

  cron.schedule('*/30 * * * * *', async () => {
    if (cronRunning) return;
    cronRunning = true;

    try {
      await auctionUpdates(io);
    } catch (err) {
      console.error('Cron Job Error:', err);
    } finally {
      cronRunning = false;
    }
  });

  console.log('⏰ Cron jobs initialized');
};
