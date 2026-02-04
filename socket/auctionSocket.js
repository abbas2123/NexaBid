const mongoose = require('mongoose');
const Property = require('../models/property');
const PropertyBid = require('../models/propertyBid');
const Payment = require('../models/payment');
const { ERROR_MESSAGES, AUCTION_TIMING } = require('../utils/constants');
const { LAST_MINUTE_WINDOW, EXTENSION_TIME } = AUCTION_TIMING;
const lastBidMap = new Map();
module.exports = (io, socket) => {
  const isAuthenticated = !!socket.user;
  const userId = socket.user?._id?.toString();
  socket.on('join', () => {
    if (!isAuthenticated) return;
    socket.join(userId);
  });
  socket.on('join_auction', ({ propertyId }, cb) => {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) return;
    const room = `auction_${propertyId}`;
    socket.join(room);
    cb?.({ success: true, room });
    socket.emit('auction_joined', { room });
  });
  socket.on('disconnect', () => {
  });
  socket.on('place_bid', async ({ propertyId, amount }) => {
    const bidAmount = Number(amount);
    if (isNaN(bidAmount)) {
      return socket.emit('bid_error', { message: 'Invalid bid amount' });
    }
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
      if (bidAmount <= property.currentHighestBid) {
        return socket.emit('bid_error', { message: ERROR_MESSAGES.BID_TOO_LOW || 'Bid too low' });
      }
      if (property.sellerId.toString() === userId) {
        return socket.emit('bid_error', { message: ERROR_MESSAGES.UNAUTHORIZED });
      }
      let payment;

      payment = await Payment.findOne({
        userId: userId,
        contextId: propertyId,
        contextType: 'property',
        type: 'participation_fee',
        status: 'success',
      });

      if (!payment) {
        const allPaymentsForUser = await Payment.find({ userId: userId });

        payment = await Payment.findOne({
          userId: userId,
          contextId: propertyId,
          contextType: 'property',
          type: 'participation_fee',
        }).sort({ createdAt: -1 });

        if (!payment) {
          payment = await Payment.findOne({
            userId: userId,
            contextId: new mongoose.Types.ObjectId(propertyId),
            contextType: 'property',
            type: 'participation_fee',
          }).sort({ createdAt: -1 });
        }
      }
      if (!payment) {
        return socket.emit('bid_error', {
          message: ERROR_MESSAGES.PAYMENT_REQUIRED,
        });
      }
      if (payment.status !== 'success') {
        let msg = 'Payment not successful';
        if (payment.status === 'pending') msg = 'Payment verification pending';
        if (payment.status === 'refunded') msg = 'Participation fee was refunded';
        if (payment.status === 'failed') msg = 'Payment failed. Please retry.';
        return socket.emit('bid_error', { message: msg });
      }
      const useTransactions = process.env.NODE_ENV !== 'test';
      const session = useTransactions ? await mongoose.startSession() : null;
      if (session) session.startTransaction();

      try {
        const updateOptions = useTransactions ? { new: true, session } : { new: true };
        const upsertOptions = useTransactions ? { upsert: true, session } : { upsert: true };

        const existingBid = await PropertyBid.findOne({ propertyId, bidderId: userId }).session(
          useTransactions ? session : null
        );

        let isAutoBid = false;
        let autoBidMax = 0;
        let escrowPaymentId = payment._id;

        if (existingBid) {

          if (existingBid.escrowPaymentId) escrowPaymentId = existingBid.escrowPaymentId;


          if (existingBid.isAutoBid && existingBid.autoBidMax > bidAmount) {
            isAutoBid = true;
            autoBidMax = existingBid.autoBidMax;
          }
        }

        const updatedProperty = await Property.findOneAndUpdate(
          {
            _id: propertyId,
            currentHighestBid: { $lt: bidAmount },
          },
          {
            $set: {
              currentHighestBid: bidAmount,
              currentHighestBidder: userId,
            },
          },
          updateOptions
        );

        if (!updatedProperty) {
          await session.abortTransaction();
          return socket.emit('bid_error', {
            message: ERROR_MESSAGES.BID_TOO_LOW || 'Bid already beaten',
          });
        }

        await PropertyBid.findOneAndUpdate(
          { propertyId, bidderId: userId },
          {
            propertyId,
            bidderId: userId,
            amount: bidAmount,
            escrowPaymentId: escrowPaymentId,
            isAutoBid: isAutoBid,
            autoBidMax: autoBidMax,
            bidStatus: 'active',
          },
          upsertOptions
        );

        const timeLeft = updatedProperty.auctionEndsAt - Date.now();
        let extended = false;
        if (timeLeft <= LAST_MINUTE_WINDOW && timeLeft > 0) {
          const updatedEndTime = new Date(updatedProperty.auctionEndsAt.getTime() + EXTENSION_TIME);
          await Property.findByIdAndUpdate(
            propertyId,
            {
              auctionEndsAt: updatedEndTime,
              extended: true,
            },
            updateOptions
          );
          extended = true;
          updatedProperty.auctionEndsAt = updatedEndTime;
        }

        if (session) await session.commitTransaction();

        const room = `auction_${propertyId}`;
        const bidderName = socket.user?.name || 'Unknown Bidder';

        io.to(room).emit('new_bid', {
          amount: bidAmount,
          bidderId: userId,
          bidderName: bidderName,
          time: new Date(),
        });


        if (extended) {
          io.to(room).emit('auction_extended', {
            newEndTime: updatedProperty.auctionEndsAt,
            extendedBy: EXTENSION_TIME / 60000,
          });
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
      } catch (error) {
        if (session) await session.abortTransaction();
        throw error;
      } finally {
        if (session) session.endSession();
      }
    } catch (err) {
      console.error('Bid Error:', err);
      socket.emit('bid_error', { message: 'Failed to place bid' });
    }
  });
};
