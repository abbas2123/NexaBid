const mongoose = require('mongoose');
const Property = require('../models/property');
const PropertyBid = require('../models/propertyBid');
const Payment = require('../models/payment');
const Wallet = require('../models/wallet');
const WalletTransaction = require('../models/walletTransaction');
const Notification = require('../models/notification');
const REFUND_PERCENT = 0.6;
module.exports = async (io) => {
  const now = new Date();
  const auctions = await Property.find({
    isAuction: true,
    auctionEndsAt: { $lt: now },
    status: { $nin: ['owned', 'closed', 'processing_refund'] },
  });
  for (const property of auctions) {
    const locked = await Property.findOneAndUpdate(
      {
        _id: property._id,
        status: { $nin: ['owned', 'closed', 'processing_refund'] },
      },
      { status: 'processing_refund' },
      { new: true }
    );
    if (!locked) continue;
    if (!property.currentHighestBidder) {
      locked.status = 'closed';
      await locked.save();
      continue;
    }
    locked.status = 'owned';
    locked.soldTo = property.currentHighestBidder;
    locked.soldAt = now;
    await locked.save();
    await PropertyBid.updateOne(
      { propertyId: property._id, bidderId: property.currentHighestBidder },
      { bidStatus: 'won', isWinningBid: true }
    );
    await Notification.create({
      userId: property.currentHighestBidder,
      message: `🎉 You won "${property.title}"`,
    });
    io.to(property.currentHighestBidder.toString()).emit('newNotification', {
      propertyId: property._id,
      amount: locked.currentHighestBid,
      message: `🎉 You won "${property.title}"`,
      type: 'won',
    });
    const losers = await PropertyBid.find({
      propertyId: property._id,
      bidderId: { $ne: property.currentHighestBidder },
      bidStatus: 'active',
    });

    const refundPromises = losers.map(async (bid) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const payment = await Payment.findById(bid.escrowPaymentId).session(session);
        if (!payment || payment.refundStatus === 'completed') {
          await session.abortTransaction();
          return;
        }

        const refundAmount = Math.round(payment.amount * REFUND_PERCENT);
        const wallet = await Wallet.findOneAndUpdate(
          { userId: bid.bidderId },
          { $inc: { balance: refundAmount } },
          { new: true, upsert: true, session }
        );

        const exists = await WalletTransaction.exists({
          'metadata.paymentId': payment._id,
        }).session(session);

        if (!exists) {
          await WalletTransaction.create(
            [
              {
                walletId: wallet._id,
                userId: bid.bidderId,
                type: 'credit',
                source: 'refund',
                amount: refundAmount,
                balanceAfter: wallet.balance,
                metadata: {
                  paymentId: payment._id,
                  propertyId: property._id,
                  reason: 'Auction lost – refund',
                },
              },
            ],
            { session }
          );
        }

        payment.refundAmount = refundAmount;
        payment.refundStatus = 'completed';
        payment.status = 'refunded';
        payment.refundReason = 'failed_bid';
        await payment.save({ session });

        bid.bidStatus = 'outbid';
        await bid.save({ session });

        await session.commitTransaction();
        io.to(bid.bidderId.toString()).emit('newNotification', {
          message: `💸 Refund ₹${refundAmount} credited`,
        });
      } catch (e) {
        await session.abortTransaction();
        console.error(`Refund failed for bidder ${bid.bidderId}:`, e);
        throw e; 
      } finally {
        session.endSession();
      }
    });

    await Promise.allSettled(refundPromises);
    io.to(`auction_${property._id}`).emit('auction_ended');
  }
};
