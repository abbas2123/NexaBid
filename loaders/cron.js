const cron = require('node-cron');
const auctionUpdates = require('../cron/auctionUpdate');
const tenderUpdates = require('../cron/tenderUpdate');
module.exports = (io) => {
  let cronRunning = false;
  cron.schedule('*/30 * * * * *', async () => {
    if (cronRunning) return;
    cronRunning = true;
    try {
      await auctionUpdates(io);
      await tenderUpdates(io);
    } catch (err) {
      console.error('Cron Job Error:', err);
    } finally {
      cronRunning = false;
    }
  });
  console.log('⏰ Cron jobs initialized');
};
