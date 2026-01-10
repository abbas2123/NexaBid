

const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const Payment = require('../../models/payment');
const File = require('../../models/File');
const { ERROR_MESSAGES } = require('../../utils/constants');


module.exports = {
  async getTechBidData(tenderId, user) {
    if (!user || (!user.isVendor && user.role !== 'vendor'))
      throw new Error(ERROR_MESSAGES.NOT_VENDOR);

    const tender = await Tender.findById(tenderId);
    if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);

    const bid = await TenderBid.findOne({ tenderId, vendorId: user._id })
      .populate('proposal.files')
      .populate('techForms.files');

    const payment = await Payment.findOne({
      userId: user._id,
      contextId: tenderId,
      type: 'participation_fee',
      status: 'success',
    });

    return { tender, bid, payments: { paymentStatus: payment ? 'paid' : 'pending' } };
  },

  async uploadTechnical(tenderId, userId, files) {
    let bid = await TenderBid.findOne({ tenderId, vendorId: userId });
    if (!bid) bid = await TenderBid.create({ tenderId, vendorId: userId });

    if (bid.finForms.files.length || bid.techForms.files.length)
      throw new Error(ERROR_MESSAGES.ALREADY_UPLOADED);

    const proposalIds = [];
    const techIds = [];

    if (files.proposalFiles) {
      for (const file of files.proposalFiles) {
        
        const saved = await File.create({
          ownerId: userId,
          fileName: file.originalname,
          fileUrl: file.path,
          mimeType: file.mimetype,
          size: file.size,
          metadata: { public_id: file.filename },
        });
        proposalIds.push(saved._id);
      }
      bid.proposal.files = proposalIds;
    }

    if (files.techFiles) {
      for (const file of files.techFiles) {
        const saved = await File.create({
          ownerId: userId,
          fileName: file.originalname,
          fileUrl: file.path,
          mimeType: file.mimetype,
          size: file.size,
          metadata: { public_id: file.filename },
        });
        techIds.push(saved._id);
      }
      bid.techForms.files = techIds;
    }

    await bid.save();
    return true;
  },

  async uploadFinancial(tenderId, userId, files, amount) {
    const bid = await TenderBid.findOne({ tenderId, vendorId: userId });
    if (!bid) throw new Error(ERROR_MESSAGES.NOT_FOUND);

    if (bid.finForms.files.length || bid.quotes.files.length)
      throw new Error(ERROR_MESSAGES.ALREADY_UPLOADED);

    const finIds = [];
    const quoteIds = [];

    if (files.finForms) {
      for (const file of files.finForms) {
        const saved = await File.create({
          ownerId: userId,
          fileName: file.originalname,
          fileUrl: file.path,
          mimeType: file.mimetype,
          size: file.size,
          metadata: { public_id: file.filename },
        });
        finIds.push(saved._id);
      }
      bid.finForms.files = finIds;
    }

    if (files.quotationFiles) {
      for (const file of files.quotationFiles) {
        const saved = await File.create({
          ownerId: userId,
          fileName: file.originalname,
          fileUrl: file.path,
          mimeType: file.mimetype,
          size: file.size,
          metadata: { public_id: file.filename },
        });
        quoteIds.push(saved._id);
      }
      bid.quotes.files = quoteIds;
    }

    if (amount) bid.quotes.amount = Number(amount);

    await bid.save();
    return true;
  },

  async getFinancialBidData(tenderId, userId) {
    const tender = await Tender.findById(tenderId);
    if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);

    const bid = await TenderBid.findOne({ tenderId, vendorId: userId })
      .populate('finForms.files')
      .populate('quotes.files');

    if (!bid) throw new Error(ERROR_MESSAGES.NO_BID);
    if (bid.techReviewStatus === 'rejected') throw new Error(ERROR_MESSAGES.TECH_REJECTED);
    if (bid.techReviewStatus !== 'accepted') throw new Error(ERROR_MESSAGES.TECH_NOT_APPROVED);

    return { tender, bid };
  },
};
