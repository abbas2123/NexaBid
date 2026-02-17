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

  await Property.updateMany(
    {
      isAuction: true,
      auctionEndsAt: { $lt: now },
      status: 'published',
    },
    {
      $set: { status: 'processing_refund' }
    }
  );


  const processingAuctions = await Property.find({
    status: 'processing_refund'
  });

  for (const property of processingAuctions) {
    await processAuctionRefunds(property, io);
  }
};


async function processAuctionRefunds(property, io) {
  try {
    const query = {
      propertyId: property._id,
      bidStatus: 'active'
    };


    if (property.currentHighestBidder) {
      query.bidderId = { $ne: property.currentHighestBidder };
    }


    const loserBids = await PropertyBid.find(query);


    for (const bid of loserBids) {
      await processSingleRefund(bid, property._id, property.title, io);
    }


    const remainingActiveLosers = await PropertyBid.countDocuments(query);

    if (remainingActiveLosers === 0) {

      await finalizeAuction(property, io);
    }

  } catch (err) {
    console.error(`Error processing auction ${property._id}:`, err);

  }
}


async function processSingleRefund(bid, propertyId, propertyTitle, io) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findById(bid.escrowPaymentId).session(session);


    if (!payment) {

      console.warn(`Payment not found for bid ${bid._id}`);

      bid.bidStatus = 'cancelled';
      await bid.save({ session });
      await session.commitTransaction();
      return;
    }


    if (payment.refundStatus === 'completed') {

      bid.bidStatus = 'outbid';
      await bid.save({ session });
      await session.commitTransaction();
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
      type: 'credit',
      source: 'refund'
    }).session(session);

    if (!exists) {
      await WalletTransaction.create(
        [{
          walletId: wallet._id,
          userId: bid.bidderId,
          type: 'credit',
          source: 'refund',
          amount: refundAmount,
          balanceAfter: wallet.balance,
          metadata: {
            paymentId: payment._id,
            propertyId: propertyId,
            reason: 'Auction lost – refund',
          },
        }],
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
      message: `💸 Refund ₹${refundAmount} credited for "${propertyTitle}"`,
    });

  } catch (e) {
    await session.abortTransaction();
    console.error(`Refund failed for bid ${bid._id}:`, e);

  } finally {
    session.endSession();
  }
}


async function finalizeAuction(property, io) {
  if (property.currentHighestBidder) {


    const updated = await Property.findOneAndUpdate(
      { _id: property._id, status: 'processing_refund' },
      {
        status: 'owned',
        soldTo: property.currentHighestBidder,
        soldAt: new Date()
      },
      { new: true }
    );

    if (updated) {

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
        amount: updated.currentHighestBid,
        message: `🎉 You won "${property.title}"`,
        type: 'won',
      });
    }

  } else {

    await Property.findOneAndUpdate(
      { _id: property._id, status: 'processing_refund' },
      { status: 'closed' }
    );
  }

  io.to(`auction_${property._id}`).emit('auction_ended');
}
