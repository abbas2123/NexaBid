// services/vendor/tenderBid.service.js

const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const Payment = require('../../models/payment');
const File = require('../../models/File');
const { ERROR_MESSAGES } = require('../../utils/constants');

module.exports = {
  async getTechBidData(tenderId, user) {
    if (!user || user.role !== 'vendor' || !user.isVendor) {
      throw new Error(ERROR_MESSAGES.NOT_VENDOR);
    }

    const tender = await Tender.findById(tenderId);
    if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);

    const bid = await TenderBid.findOne({
      tenderId,
      vendorId: user._id,
    })
      .populate('proposal.files')
      .populate('techForms.files');

    const participationPayment = await Payment.findOne({
      userId: user._id,
      contextId: tenderId,
      type: 'participation_fee',
      status: 'success',
    });
    console.log('participationPayment:', participationPayment);
    return {
      tender,
      bid,
      payments: {
        paymentStatus: participationPayment ? 'paid' : 'pending',
      },
    };
  },
  async uploadTechnical(tenderId, userId, files) {
    let bid = await TenderBid.findOne({ tenderId, vendorId: userId });

    if (!bid) {
      bid = await TenderBid.create({ tenderId, vendorId: userId });
    }

    if (bid.finForms.files.length > 0 || bid.techForms.files.length > 0) {
      throw new Error(ERROR_MESSAGES.ALREADY_UPLOADED);
    }

    const proposalFiles = [];
    const techFiles = [];

    // Save proposal files
    if (files.proposalFiles) {
      for (const file of files.proposalFiles) {
        const saved = await File.create({
          fileName: file.filename,
          fileUrl: `/uploads/tender-proposalDocs/${file.filename}`,
          originalName: file.originalname,
          uploadedBy: userId,
        });
        proposalFiles.push(saved._id);
      }
      bid.proposal.files = proposalFiles;
    }

    // Save technical files
    if (files.techFiles) {
      for (const file of files.techFiles) {
        const saved = await File.create({
          fileName: file.filename,
          fileUrl: `/uploads/tender-techDocs/${file.filename}`,
          originalName: file.originalname,
          uploadedBy: userId,
        });
        techFiles.push(saved._id);
      }
      bid.techForms.files = techFiles;
    }

    await bid.save();
    return true;
  },

  // ---------------------------------------------
  // UPLOAD FINANCIAL DOCUMENTS
  // ---------------------------------------------
  async uploadFinancial(tenderId, userId, files, amount) {
    const bid = await TenderBid.findOne({ tenderId, vendorId: userId });
    if (!bid) throw new Error(ERROR_MESSAGES.NOT_FOUND);

    if (bid.finForms.files.length > 0 || bid.quotes.files?.length > 0) {
      throw new Error(ERROR_MESSAGES.ALREADY_UPLOADED);
    }

    const finFiles = [];
    const quoteFiles = [];

    // Financial documents
    if (files.finForms) {
      for (const file of files.finForms) {
        const saved = await File.create({
          fileName: file.filename,
          fileUrl: `/uploads/tender-finDocs/${file.filename}`,
          originalName: file.originalname,
          uploadedBy: userId,
        });
        finFiles.push(saved._id);
      }
      bid.finForms.files = finFiles;
    }

    // Quotation documents
    if (files.quotationFiles) {
      for (const file of files.quotationFiles) {
        const saved = await File.create({
          fileName: file.filename,
          fileUrl: `/uploads/tender-quoteDocs/${file.filename}`,
          originalName: file.originalname,
          uploadedBy: userId,
        });
        quoteFiles.push(saved._id);
      }
      bid.quotes.files = quoteFiles;
    }

    // Save amount
    if (amount) {
      bid.quotes.amount = Number(amount);
    }

    await bid.save();
    return true;
  },

  // ---------------------------------------------
  // FETCH FINANCIAL BID PAGE DATA
  // ---------------------------------------------
  async getFinancialBidData(tenderId, userId) {
    const tender = await Tender.findById(tenderId);
    if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);

    const bid = await TenderBid.findOne({
      tenderId,
      vendorId: userId,
    })
      .populate('finForms.files')
      .populate('quotes.files');

    if (!bid) throw new Error(ERROR_MESSAGES.NO_BID);

    if (bid.techReviewStatus === 'rejected') throw new Error(ERROR_MESSAGES.TECH_REJECTED);

    if (bid.techReviewStatus !== 'accepted') throw new Error(ERROR_MESSAGES.TECH_NOT_APPROVED);

    return { tender, bid };
  },
};
