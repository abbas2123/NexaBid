const mongoose = require('mongoose');
const Tender = require('../models/tender');
const TenderBid = require('../models/tenderBid');
const Payment = require('../models/payment');
const Wallet = require('../models/wallet');
const WalletTransaction = require('../models/walletTransaction');
const Notification = require('../models/notification');
const REFUND_PERCENT = 0.6;
module.exports = async (io) => {
    try {
        const awardedTenders = await Tender.find({
            status: 'awarded',
        }).select('_id title');
        for (const tender of awardedTenders) {
            const losingBids = await TenderBid.find({
                tenderId: tender._id,
                isWinner: false,
            }).populate('vendorId', '_id');
            const refundPromises = losingBids.map(async (bid) => {
                if (!bid.vendorId) return;
                const session = await mongoose.startSession();
                session.startTransaction();
                try {
                    const payment = await Payment.findOne({
                        userId: bid.vendorId._id,
                        contextId: tender._id,
                        type: 'participation_fee',
                        status: 'success',
                        refundStatus: { $ne: 'completed' },
                    }).session(session);

                    if (!payment) {
                        await session.abortTransaction();
                        return;
                    }

                    const refundAmount = Math.round(payment.amount * REFUND_PERCENT);
                    const wallet = await Wallet.findOneAndUpdate(
                        { userId: bid.vendorId._id },
                        { $inc: { balance: refundAmount } },
                        { new: true, upsert: true, session }
                    );

                    const exists = await WalletTransaction.exists({
                        'metadata.paymentId': payment._id,
                        'metadata.reason': 'Tender lost – refund',
                    }).session(session);

                    if (!exists) {
                        await WalletTransaction.create(
                            [
                                {
                                    walletId: wallet._id,
                                    userId: bid.vendorId._id,
                                    type: 'credit',
                                    source: 'refund',
                                    amount: refundAmount,
                                    balanceAfter: wallet.balance,
                                    metadata: {
                                        paymentId: payment._id,
                                        tenderId: tender._id,
                                        reason: 'Tender lost – refund',
                                    },
                                },
                            ],
                            { session }
                        );
                    }

                    payment.refundAmount = refundAmount;
                    payment.refundStatus = 'completed';
                    payment.status = 'refunded';
                    payment.refundReason = 'tender_lost';
                    await payment.save({ session });
                    await session.commitTransaction();

                    io.to(bid.vendorId._id.toString()).emit('newNotification', {
                        message: `💸 Refund ₹${refundAmount} credited`,
                    });
                    await Notification.create({
                        userId: bid.vendorId._id,
                        message: `💸 Refund ₹${refundAmount} credited for tender "${tender.title}"`,
                        link: '/wallet',
                    });
                    console.log(`Processed refund for Bidder ${bid.vendorId._id} on Tender ${tender._id}`);
                } catch (e) {
                    await session.abortTransaction();
                    console.error(`Refund processing failed for bidder ${bid.vendorId?._id}:`, e);
                    throw e;
                } finally {
                    session.endSession();
                }
            });

            await Promise.allSettled(refundPromises);
        }
    } catch (err) {
        console.error('Tender Refund Cron Error:', err);
    }
};
