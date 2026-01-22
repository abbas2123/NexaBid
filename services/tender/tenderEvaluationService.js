const mongoose = require('mongoose');
const isTestEnv = require('../../utils/isTestEnv');
const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const notification = require('../notificationService');
const { ERROR_MESSAGES } = require('../../utils/constants');

module.exports = {
  async getEvaluationData(tenderId, userId) {
    const tender = await Tender.findById(tenderId);
    if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);
    if (tender.createdBy.toString() !== userId.toString()) {
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }
    let bids = await TenderBid.find({ tenderId })
      .populate('vendorId', 'name email companyName')
      .populate('proposal.files')
      .populate('techForms.files')
      .populate('finForms.files')
      .populate('quotes.files');

    bids = bids.map((b) => ({
      _id: b._id,
      vendor: {
        _id: b.vendorId._id,
        name: b.vendorId.name,
      },
      proposal: {
        files: (b.proposal?.files || []).map((f) => ({
          fileName: f.originalName || f.fileName,
          fileUrl: f.fileUrl,
        })),
      },
      technical: {
        files: (b.techForms?.files || []).map((f) => ({
          fileName: f.originalName || f.fileName,
          fileUrl: f.fileUrl,
        })),
      },
      financial: {
        files: (b.finForms?.files || []).map((f) => ({
          fileName: f.originalName || f.fileName,
          fileUrl: f.fileUrl,
        })),
      },
      quotes: {
        amount: b.quotes?.amount || 0,
        files: (b.quotes?.files || []).map((f) => ({
          fileName: f.originalName || f.fileName,
          fileUrl: f.fileUrl,
        })),
      },
      offeredAmount: b.quotes?.amount || 0,
      techStatus: b.techReviewStatus || 'pending',
      finStatus: b.finReviewStatus || 'pending',
      isWinner: b.isWinner || false,
    }));
    return { tender, bids };
  },

  async acceptTechnical(bidId) {
    const bid = await TenderBid.findById(bidId);
    if (!bid) throw new Error(ERROR_MESSAGES.BID_NOT_FOUND);
    bid.techReviewStatus = 'accepted';
    await bid.save();
    return bid.tenderId;
  },

  async rejectTechnical(bidId) {
    const bid = await TenderBid.findById(bidId);
    if (!bid) throw new Error(ERROR_MESSAGES.BID_NOT_FOUND);
    bid.techReviewStatus = 'rejected';
    await bid.save();
    return bid.tenderId;
  },

  async selectWinner(bidId, io) {
    const useTransactions = !isTestEnv;
    const session = useTransactions ? await mongoose.startSession() : null;
    if (session) session.startTransaction();

    try {
      const bid = await TenderBid.findById(bidId)
        .populate('vendorId')
        .session(session);
      if (!bid) throw new Error(ERROR_MESSAGES.BID_NOT_FOUND);

      const { tenderId } = bid;



      bid.finReviewStatus = 'accepted';
      bid.techReviewStatus = 'accepted';
      bid.isWinner = true;
      await bid.save({ session });


      await Tender.findByIdAndUpdate(
        tenderId,
        {
          awardedTo: bid.vendorId._id,
          status: 'awarded',
          awardedAt: new Date(),
          isClosed: true,
        },
        { session }
      );

      await TenderBid.updateMany(
        { tenderId, _id: { $ne: bidId } },
        {
          $set: {
            finReviewStatus: 'rejected',
            techReviewStatus: 'rejected',
            isWinner: false,
          },
        },
        { session }
      );

      if (session) {
        await session.commitTransaction();
        session.endSession();
      }
    } catch (error) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      throw error;
    }


    try {
      const bid = await TenderBid.findOne({ _id: bidId }).populate('vendorId');
      const tender = await Tender.findById(bid.tenderId);

      const notificationTasks = [];

      if (bid && bid.vendorId) {
        notificationTasks.push(
          notification.sendNotification(
            bid.vendorId._id,
            `🎉 You WON the tender: ${tender.title}`,
            `/user/my-participation/tender/${tender._id}`,
            io
          )
        );
      }

      const losers = await TenderBid.find({
        tenderId: tender._id,
        _id: { $ne: bidId },
      }).populate('vendorId');

      for (const b of losers) {
        if (b.vendorId) {
          notificationTasks.push(
            notification.sendNotification(
              b.vendorId._id,
              `You were not selected for tender: ${tender.title}`,
              `/user/my-participation/tender/${tender._id}`,
              io
            )
          );
        }
      }

      notificationTasks.push(
        notification.sendNotification(
          tender.createdBy,
          `Winner selected for tender "${tender.title}" → ${bid.vendorId.name}`,
          `/user/status/my-listing/owner/tender/${tender._id}/evaluation`,
          io
        )
      );

      await Promise.all(notificationTasks);
    } catch (notifyError) {
      console.error('Notification Error (Non-blocking):', notifyError.message);
    }

    return await TenderBid.findById(bidId).then(b => b.tenderId);
  },
};
