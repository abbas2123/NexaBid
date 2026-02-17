const cron = require('node-cron');
const auctionUpdates = require('../cron/auctionUpdate');
const tenderUpdates = require('../cron/tenderUpdate');
const JobLock = require('../models/JobLock');

module.exports = (io) => {
  cron.schedule('*/30 * * * * *', async () => {
    const jobName = 'auction_cron';

    try {
      const now = new Date();
      const lockDuration = 2 * 60 * 1000;

      await JobLock.deleteOne({ jobName, expireAt: { $lt: now } });

      try {
        await JobLock.create({
          jobName,
          lockedAt: now,
          expireAt: new Date(now.getTime() + lockDuration)
        });
      } catch (e) {
        if (e.code === 11000) {
          console.log(`[Cron] Job '${jobName}' is locked by another instance. Skipping.`);
          return;
        }
        throw e;
      }

      console.log(`[Cron] Acquired lock for '${jobName}'. Running updates...`);

      await auctionUpdates(io);
      await tenderUpdates(io);

      await JobLock.deleteOne({ jobName });
      console.log(`[Cron] Finished '${jobName}' and released lock.`);

    } catch (err) {
      console.error('[Cron] Job Error:', err);
      try { await JobLock.deleteOne({ jobName }); } catch (e) { /* ignore */ }
    }
  });
};
