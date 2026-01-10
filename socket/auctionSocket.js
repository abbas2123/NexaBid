const mongoose = require('mongoose');
const Property = require('../models/property');
const PropertyBid = require('../models/propertyBid');
const Payment = require('../models/payment');
const { ERROR_MESSAGES } = require('../utils/constants');

const LAST_MINUTE_WINDOW = 2 * 60 * 1000;
const EXTENSION_TIME = 2 * 60 * 1000;

const lastBidMap = new Map();

module.exports = (io, socket) => {
  const isAuthenticated = !!socket.user;
  const userId = socket.user?._id?.toString();

  console.log();

  socket.on('join', () => {
    if (!isAuthenticated) return;
    socket.join(userId);
    console.log();
  });

  socket.on('join_auction', ({ propertyId }, cb) => {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) return;

    const room = `auction_${propertyId}`;
    socket.join(room);

    console.log(`User ${userId} joined auction room: ${room}`);

    cb?.({ success: true, room });

    socket.emit('auction_joined', { room });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.user?.name || 'Guest'} (${socket.id})`);
  });

  socket.on('place_bid', async ({ propertyId, amount }) => {
    try {
      if (!isAuthenticated) {
        return socket.emit('bid_error', { message: ERROR_MESSAGES.UNAUTHORIZED });
      }

      if (!mongoose.Types.ObjectId.isValid(propertyId)) {
        return socket.emit('bid_error', { message: ERROR_MESSAGES.INVALID_AUCTION });
      }

      const now = Date.now();
      const last = lastBidMap.get(userId) || 0;
      if (now - last < 500) return;
      lastBidMap.set(userId, now);

      const property = await Property.findById(propertyId);
      if (!property || !property.isAuction) {
        return socket.emit('bid_error', {
          message: ERROR_MESSAGES.INVALID_AUCTION,
        });
      }

      if (property.auctionStartsAt && new Date() < property.auctionStartsAt) {
        return socket.emit('bid_error', { message: 'Auction has not started yet' });
      }

      if (new Date() > property.auctionEndsAt) {
        return socket.emit('bid_error', { message: ERROR_MESSAGES.AUCTION_NOT_ENDED });
      }

      if (property.sellerId.toString() === userId) {
        return socket.emit('bid_error', { message: ERROR_MESSAGES.UNAUTHORIZED });
      }

      const payment = await Payment.findOne({
        userId,
        contextId: propertyId,
        contextType: 'property',
        type: 'participation_fee',
        status: 'success',
      });

      if (!payment) {
        return socket.emit('bid_error', {
          message: ERROR_MESSAGES.PAYMENT_REQUIRED,
        });
      }
      const updatedProperty = await Property.findOneAndUpdate(
        {
          _id: propertyId,
          currentHighestBid: { $lt: amount },
        },
        {
          $set: {
            currentHighestBid: amount,
            currentHighestBidder: userId,
          },
        },
        { new: true }
      );

      if (!updatedProperty) {
        return socket.emit('bid_error', { message: 'Bid already beaten or invalid' });
      }
      await PropertyBid.findOneAndUpdate(
        { propertyId, bidderId: userId },
        {
          propertyId,
          bidderId: userId,
          amount: amount,
          escrowPaymentId: payment._id,
          isAutoBid: false,
          bidStatus: 'active',
        },
        { upsert: true }
      );

      const timeLeft = updatedProperty.auctionEndsAt - Date.now();
      let extended = false;

      if (!updatedProperty.extended && timeLeft <= LAST_MINUTE_WINDOW) {
        const newEndTime = new Date(updatedProperty.auctionEndsAt.getTime() + EXTENSION_TIME);
        await Property.findByIdAndUpdate(propertyId, {
          auctionEndsAt: newEndTime,
          extended: true,
        });
        extended = true;

        updatedProperty.auctionEndsAt = newEndTime;
      }

      const room = `auction_${propertyId}`;
      io.to(room).emit('new_bid', {
        amount,
        bidderId: userId,
        bidderName: socket.user.name,
        time: new Date(),
      });

      console.log(`Bid placed: ${amount} by ${userId} on ${propertyId}`);

      if (extended) {
        io.to(room).emit('auction_extended', {
          newEndTime: updatedProperty.auctionEndsAt,
          extendedBy: EXTENSION_TIME / 60000,
        });
        console.log(`⏰ Auction ${propertyId} extended by ${EXTENSION_TIME / 60000} minutes`);
      }

      if (!updatedProperty.autoBidLock) {
        await Property.findByIdAndUpdate(propertyId, { autoBidLock: true });

        try {
          const AuctionService = require('../services/auction/auctionService');
          await AuctionService.handleAutoBids(propertyId, io);
        } catch (e) {
          console.error('AutoBid Error:', e);
        } finally {
          await Property.findByIdAndUpdate(propertyId, { autoBidLock: false });
        }
      }
    } catch (err) {
      console.error('Bid Error:', err);
      socket.emit('bid_error', { message: 'Failed to place bid' });
    }
  });
};
