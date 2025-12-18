// sockets/auction.socket.js
const Property = require('../models/property');
const PropertyBid = require('../models/propertyBid');

const Last_MINUTE_WINDOW = 2 * 60 * 1000;
const EXTENSION_TIME = 2 * 60 * 1000;


module.exports = (io) => {
  io.on('connection', (socket) => {

     socket.on("join", (userId) => {
  socket.join(userId);
    console.log(`User joined room: ${userId}`);
  });

    socket.on('join_auction', ({ propertyId, userId }) => {
      socket.userId = userId;
      socket.join(`auction_${propertyId}`);
    });

    socket.on('place_bid', async ({ propertyId, amount }) => {
      const property = await Property.findById(propertyId);

      if (!property || !property.isAuction) return;

      const now = new Date();

    
      if (now > property.auctionEndsAt) {
        socket.emit('bid_error', { message: 'Auction ended' });
        return;
      }

     
      if (property.sellerId.toString() === socket.userId) return;

      const current = property.currentHighestBid || 0;
      const min = current === 0 ? property.basePrice + 1 : current + 1;
      const max = current === 0 ? null : current + property.auctionStep;

      if (amount < min || (max && amount > max)) {
        socket.emit('bid_error', {
          message: `Bid must be between ₹${min} and ₹${max}`,
        });
        return;
      }

      await PropertyBid.create({
        propertyId,
        bidderId: socket.userId,
        amount,
      });

      property.currentHighestBid = amount;
      property.currentHighestBidder = socket.userId;

      const timeLeft = property.auctionEndsAt - now;

      let extended = false;

      if(timeLeft<=Last_MINUTE_WINDOW){
        property.auctionEndsAt = new Date(
          property.auctionEndsAt.getTime()+EXTENSION_TIME
        );
        extended = true;
      }
      await property.save();

      io.to(`auction_${propertyId}`).emit('new_bid', {
        amount,
        bidderId: socket.userId,
        time: new Date(),
        currentHighestBid:amount,
      });

      if(extended){
        io.to(`auction_${propertyId}`).emit('auction_extended',{
          newEndTime:property.auctionEndsAt,
          extendedBy: EXTENSION_TIME/60000
        });
      }

      const autoBidders = await PropertyBid.find({
        propertyId,
        isAutoBid:true,
        autoBidMax:{$gt:amount},
        bidderId:{$ne:socket.userId},
      }).sort({autoBidMax:-1});

      if(autoBidders.length>0){
        const next = autoBidders[0];
        const nextBid = Math.min(
          next.autoBidMax,
          amount+property.auctionStep
        );
          await PropertyBid.create({
            propertyId,
            bidderId: next.bidderId,
            amount: nextBid,
            isAutoBid: true,
            autoBidMax: next.autoBidMax,
          });

          // Update property
          property.currentHighestBid = nextBid;
          property.currentHighestBidder = next.bidderId;
          await property.save();

          // Emit new bid
          io.to(`auction_${propertyId}`).emit('new_bid', {
            amount: nextBid,
            bidderId: next.bidderId,
            isAutoBid: true,
            time: new Date(),
          });
      }

    });
  });
};
