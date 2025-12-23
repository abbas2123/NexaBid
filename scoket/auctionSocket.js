const Property = require('../models/property');
const PropertyBid = require('../models/propertyBid');
const Payment = require('../models/payment');
const mongoose = require('mongoose');

const LAST_MINUTE_WINDOW = 2 * 60 * 1000;
const EXTENSION_TIME = 2 * 60 * 1000;


const lastBidMap = new Map();

module.exports = (io, socket) => {
  socket.on('join', () => {
    socket.join(socket.user._id.toString());
  });

  // join auction room
  socket.on('join_auction', ({ propertyId }) => {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) return;
    socket.join(`auction_${propertyId}`);
  });

  socket.on('place_bid', async ({ propertyId, amount }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(propertyId)) {
        return socket.emit('bid_error', { message: 'Invalid auction' });
      }

     
      const now = Date.now();
      const last = lastBidMap.get(socket.id) || 0;
      if (now - last < 500) return;
      lastBidMap.set(socket.id, now);

      const property = await Property.findById(propertyId);
      if (!property || !property.isAuction) return;

      if (new Date() > property.auctionEndsAt) {
        return socket.emit('bid_error', { message: 'Auction ended' });
      }

      const userId = socket.user._id.toString();

      // Seller cannot bid
      if (property.sellerId.toString() === userId) return;

      // Participation fee check
      const payment = await Payment.findOne({
        userId,
        contextId: propertyId,
        contextType: 'property',
        type: 'participation_fee',
        status: 'success',
      });

      if (!payment) {
        return socket.emit('bid_error', {
          message: 'Pay participation fee first',
        });
      }

      // Bid validation
      const current = property.currentHighestBid || 0;
      const min = current === 0 ? property.basePrice + 1 : current + 1;
      const max = current === 0 ? null : current + property.auctionStep;

      if (amount < min || (max && amount > max)) {
        return socket.emit('bid_error', {
          message: `Bid must be between ₹${min} and ₹${max}`,
        });
      }

      // Save bid
      await PropertyBid.findOneAndUpdate(
        { propertyId, bidderId: userId },
        {
          propertyId,
          bidderId: userId,
          amount,
          escrowPaymentId: payment._id,
          isAutoBid: false,
          bidStatus: 'active',
        },
        { upsert: true }
      );

      property.currentHighestBid = amount;
      property.currentHighestBidder = userId;

      // Extend auction if needed
      const timeLeft = property.auctionEndsAt - Date.now();
      let extended = false;

      if (timeLeft <= LAST_MINUTE_WINDOW) {
        property.auctionEndsAt = new Date(
          property.auctionEndsAt.getTime() + EXTENSION_TIME
        );
        extended = true;
      }

      await property.save();

      io.to(`auction_${propertyId}`).emit('new_bid', {
        amount,
        bidderId: userId,
        bidderName: socket.user.name,
        time: new Date(),
      });

      if (extended) {
        io.to(`auction_${propertyId}`).emit('auction_extended', {
          newEndTime: property.auctionEndsAt,
          extendedBy: EXTENSION_TIME / 60000,
        });
      }
    } catch (err) {
      console.error('❌ Socket bid error:', err);
      socket.emit('bid_error', { message: 'Bid failed' });
    }
  });
};
