const Property = require('../models/property');
const PropertyBid = require('../models/propertyBid');
const Payment = require('../models/payment');
const Wallet = require('../models/wallet');
const WalletTransaction = require('../models/walletTransaction');
const Notification = require('../models/notification');

module.exports = async (io) => {
  const now = new Date();

  const auctions = await Property.find({
    isAuction: true,
    auctionEndsAt: { $lt: now },
    status: { $nin: ['owned', 'closed'] },
  });

  console.log(`🔍 Found ${auctions.length} auctions to process`);

  for (const property of auctions) {
    console.log(`\n Processing auction: ${property.title}`);

    
    if (!property.currentHighestBidder) {
      property.status = 'closed';
      await property.save();
      console.log(' No bids - auction closed');
      continue;
    }

    //WINNER
    property.status = 'owned';
    property.soldTo = property.currentHighestBidder;
    property.soldAt = now;
    await property.save();

    await PropertyBid.findOneAndUpdate(
      {
        propertyId: property._id,
        bidderId: property.currentHighestBidder,
      },
      {
        bidStatus: 'won',
        isWinningBid: true,
      }
    );

    await Notification.create({
      userId: property.currentHighestBidder,
      message: `🎉 You won the auction for "${property.title}"`,
    });

    io.to(property.currentHighestBidder.toString()).emit('newNotification', {
      propertyId: property._id,
    });

    console.log('✅ Winner declared:', property.currentHighestBidder);


    const losingBids = await PropertyBid.find({
      propertyId: property._id,
      bidderId: { $ne: property.currentHighestBidder },
      bidStatus: 'active',
    });

    console.log(`💔 Found ${losingBids.length} losing bids to process`);

    for (const bid of losingBids) {
      console.log(`\n💸 Processing refund for bid:`, bid._id);

      bid.bidStatus = 'outbid';
      bid.isWinningBid = false;
      await bid.save();

      await Notification.create({
        userId: bid.bidderId,
        message: `Auction ended for "${property.title}". 60% refunded to wallet.`,
      });

      io.to(bid.bidderId.toString()).emit('newNotification', {
        propertyId: property._id,
      });

      
      if (!bid.escrowPaymentId) {
        console.log('⚠️ No escrow payment ID for bid:', bid._id);
        continue;
      }

      const payment = await Payment.findById(bid.escrowPaymentId);

      
      if (!payment) {
        console.log('⚠️ Payment not found:', bid.escrowPaymentId);
        continue;
      }

      if (payment.status !== 'success') {
        console.log('⚠️ Payment status is not success:', payment.status);
        continue;
      }

      if (payment.refundStatus === 'completed') {
        console.log('⚠️ Refund already completed for payment:', payment._id);
        continue;
      }

      
      const baseAmount = payment.metadata?.originalAmount || payment.amount;
      const refundAmount = Math.round(baseAmount * 0.6);

      console.log(' Refund calculation:', {
        baseAmount,
        refundAmount,
        bidderId: bid.bidderId,
      });

      
      let wallet = await Wallet.findOne({ userId: bid.bidderId });

      if (!wallet) {
        console.log(' Creating new wallet for user:', bid.bidderId);
        wallet = await Wallet.create({
          userId: bid.bidderId,
          balance: 0,
        });
        console.log('✅ Wallet created:', wallet._id);
      }

      console.log(' Current wallet balance:', wallet.balance);

      
      wallet.balance += refundAmount;
      wallet.updatedAt = now;
      await wallet.save();

      console.log('✅ New wallet balance:', wallet.balance);

    
     
      await WalletTransaction.create({
        walletId: wallet._id,
        userId: bid.bidderId,
        type: 'credit',
        source: 'refund',
        amount: refundAmount,
        balanceAfter: wallet.balance,
        metadata: {
          propertyId: property._id,
          paymentId: payment._id,
          reason: 'Auction lost – 60% refund',
        },
      });

      console.log('✅ Wallet transaction created');

      //Update payment refund state
      payment.refundAmount = refundAmount;
      payment.refundStatus = 'completed';
      payment.refundReason = 'failed_bid';
      payment.status = 'refunded';
      await payment.save();

      console.log('✅ Payment updated to refunded status');
    }

    io.to(`auction_${property._id}`).emit('auction_ended', {
      propertyId: property._id,
    });

    console.log('✅ Auction completed:', property.title);
  }

  console.log('\n✅ Auction lifecycle + wallet refunds processed successfully');
};
