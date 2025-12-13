

const Tender = require("../../models/tender");
const TenderBid = require("../../models/tenderBid");
const notification = require('../../services/notificationService');
const PO = require("../../models/purchaseOrder");
const Agreement = require("../../models/agreement");
const WorkOrder = require("../../models/workOrder");


module.exports = {
  async getEvaluationData(tenderId, userId) {
    const tender = await Tender.findById(tenderId);
    if (!tender) throw new Error("TENDER_NOT_FOUND");

    if (tender.createdBy.toString() !== userId.toString()) {
      throw new Error("UNAUTHORIZED");
    }


    let bids = await TenderBid.find({ tenderId })
      .populate("vendorId", "name email companyName")
      .populate("proposal.files")
      .populate("techForms.files")
      .populate("finForms.files")
      .populate("quotes.files");

    
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
      techStatus: b.techReviewStatus || "pending",
      finStatus: b.finReviewStatus || "pending",
      isWinner: b.isWinner || false,
    }));

    return { tender, bids };
  },


  async acceptTechnical(bidId) {
    const bid = await TenderBid.findById(bidId);
    if (!bid) throw new Error("BID_NOT_FOUND");

    bid.techReviewStatus = "accepted";
    await bid.save();

    return bid.tenderId;
  },

  
  async rejectTechnical(bidId) {
    const bid = await TenderBid.findById(bidId);
    if (!bid) throw new Error("BID_NOT_FOUND");

    bid.techReviewStatus = "rejected";
    await bid.save();

    return bid.tenderId;
  },

 
  async selectWinner(bidId, io) {
    const bid = await TenderBid.findById(bidId).populate("vendorId");
    if (!bid) throw new Error("BID_NOT_FOUND");

    const tenderId = bid.tenderId;
    const tender = await Tender.findById(tenderId);

   
    bid.finReviewStatus = "accepted";
    bid.techReviewStatus = "accepted";
    bid.isWinner = true;
    await bid.save();

    // Update tender
    await Tender.findByIdAndUpdate(tenderId, {
      awardedTo: bid.vendorId._id,
      status: "awarded",
      awardedAt: new Date(),
      isClosed: true,
    });

    
    await TenderBid.updateMany(
      { tenderId, _id: { $ne: bidId } },
      {
        $set: {
          finReviewStatus: "rejected",
          techReviewStatus: "rejected",
          isWinner: false,
        },
      }
    );

    
    await notification.sendNotification(
  bid.vendorId._id,
  `🎉 You WON the tender: ${tender.title}`,
  `/vendor/tender/${tenderId}/result`,
  io
);

    // Notify losers
    const losers = await TenderBid.find({
      tenderId,
      _id: { $ne: bidId },
    }).populate("vendorId");

    for (let b of losers) {
  await notification.sendNotification(
    b.vendorId._id,
    `You were not selected for tender: ${tender.title}`,
    `/vendor/tender/${tenderId}/result`,
    io
  );
}

   await notification.sendNotification(
  tender.createdBy,
  `Winner selected for tender "${tender.title}" → ${bid.vendorId.name}`,
  `/user/status/my-listing/owner/tender/${tenderId}/evaluation`,
  io
);

    return tenderId;
  },
};

