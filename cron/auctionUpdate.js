
const Property = require('../models/property');
const PropertyBid = require('../models/propertyBid');
const Notification = require('../models/notification');

module.exports = async (io) => {
  const now = new Date();

  const auctions = await Property.find({
    isAuction: true,
    auctionEndsAt: { $lt: now },
    status: { $nin: ['owned', 'closed'] },
  });

  for (const p of auctions) {
   
    if (p.currentHighestBid > 0 && p.currentHighestBidder) {
      p.soldTo = p.currentHighestBidder;
      p.soldAt = now;
      p.status = 'owned';
      await p.save();

      
      await Notification.create({
        userId: p.currentHighestBidder,
        message: `🎉 You won the auction for "${p.title}"`,
      });

      io.to(p.currentHighestBidder.toString()).emit('newNotification', {
        propertyId: p._id,
        amount: p.currentHighestBid,
      });

      
      const losers = await PropertyBid.find({
        propertyId: p._id,
        bidderId: { $ne: p.currentHighestBidder },
      }).distinct('bidderId');

      for (const loserId of losers) {
        await Notification.create({
          userId: loserId,
          message: `Auction ended for "${p.title}". You did not win.`,
        });

        io.to(loserId.toString()).emit('newNotification', {
          propertyId: p._id,
        });
      }
    } else {
      
      p.status = 'closed';
      p.soldTo = null;
      await p.save();
    }

  
    io.to(`auction_${p._id}`).emit('auction_ended', {
      propertyId: p._id,
    });
  }

  console.log('✅ Auction lifecycle processed');
};
