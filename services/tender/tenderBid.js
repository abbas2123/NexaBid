const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const Payment = require('../../models/payment');
const File = require('../../models/File');
const { uploadToCloudinary } = require('../../utils/cloudinaryHelper');
const { ERROR_MESSAGES } = require('../../utils/constants');
const isTestEnv = require('../../utils/isTestEnv');

module.exports = {
  async getTechBidData(tenderId, user) {
    if (!user || (!user.isVendor && user.role !== 'vendor'))
      throw new Error(ERROR_MESSAGES.NOT_VENDOR);
    const tender = await Tender.findById(tenderId);
    if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);
    if (tender.isBlocked) throw new Error('This tender has been blocked by admin');
    const bid = await TenderBid.findOne({ tenderId, vendorId: user._id })
      .populate('proposal.files')
      .populate('techForms.files');
    const payment = await Payment.findOne({
      userId: user._id,
      contextId: tenderId,
      type: 'participation_fee',
      status: 'success',
    });
    return {
      tender,
      bid,
      payments: { paymentStatus: payment ? 'paid' : 'pending' },
      isTenderClosed: ['awarded', 'closed', 'completed'].includes(tender.status),
    };
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
        let fileUrl = file.path;
        let publicId = file.filename;
        if (file.buffer) {
          if (isTestEnv) {
            fileUrl = 'http://mock-url.com/' + file.originalname;
            publicId = 'mock-id-' + Date.now();
          } else {
            const cld = await uploadToCloudinary(
              file.buffer,
              'nexabid/bids/proposal',
              file.originalname,
              'raw'
            );
            fileUrl = cld.secure_url;
            publicId = cld.public_id;
          }
        }
        const saved = await File.create({
          ownerId: userId,
          fileName: file.originalname,
          fileUrl: fileUrl,
          mimeType: file.mimetype,
          size: file.size,
          metadata: { public_id: publicId },
        });
        proposalIds.push(saved._id);
      }
      bid.proposal.files = proposalIds;
    }

    if (files.techFiles) {
      for (const file of files.techFiles) {
        let fileUrl = file.path;
        let publicId = file.filename;
        if (file.buffer) {
          if (isTestEnv) {
            fileUrl = 'http://mock-url.com/' + file.originalname;
            publicId = 'mock-id-' + Date.now();
          } else {
            const cld = await uploadToCloudinary(
              file.buffer,
              'nexabid/bids/tech',
              file.originalname,
              'raw'
            );
            fileUrl = cld.secure_url;
            publicId = cld.public_id;
          }
        }
        const saved = await File.create({
          ownerId: userId,
          fileName: file.originalname,
          fileUrl: fileUrl,
          mimeType: file.mimetype,
          size: file.size,
          metadata: { public_id: publicId },
        });
        techIds.push(saved._id);
      }
      bid.techForms.files = techIds;
    }

    await bid.save();
    return true;
  },

  async uploadFinancial(tenderId, userId, files, amount) {
    const bidCheck = await TenderBid.findOne({ tenderId, vendorId: userId });
    if (!bidCheck) throw new Error(ERROR_MESSAGES.NOT_FOUND);
    if (bidCheck.finForms.files.length || bidCheck.quotes.files.length)
      throw new Error(ERROR_MESSAGES.ALREADY_UPLOADED);

    const finIds = [];
    const quoteIds = [];

    if (files.finForms) {
      for (const file of files.finForms) {
        let fileUrl = file.path;
        let publicId = file.filename;
        if (file.buffer) {
          if (isTestEnv) {
            fileUrl = 'http://mock-url.com/' + file.originalname;
            publicId = 'mock-id-' + Date.now();
          } else {
            const cld = await uploadToCloudinary(
              file.buffer,
              'nexabid/bids/fin',
              file.originalname,
              'raw'
            );
            fileUrl = cld.secure_url;
            publicId = cld.public_id;
          }
        }
        const saved = await File.create({
          ownerId: userId,
          fileName: file.originalname,
          fileUrl: fileUrl,
          mimeType: file.mimetype,
          size: file.size,
          metadata: { public_id: publicId },
        });
        finIds.push(saved._id);
      }
    }

    if (files.quotationFiles) {
      for (const file of files.quotationFiles) {
        let fileUrl = file.path;
        let publicId = file.filename;
        if (file.buffer) {
          if (isTestEnv) {
            fileUrl = 'http://mock-url.com/' + file.originalname;
            publicId = 'mock-id-' + Date.now();
          } else {
            const cld = await uploadToCloudinary(
              file.buffer,
              'nexabid/bids/fin',
              file.originalname,
              'raw'
            );
            fileUrl = cld.secure_url;
            publicId = cld.public_id;
          }
        }
        const saved = await File.create({
          ownerId: userId,
          fileName: file.originalname,
          fileUrl: fileUrl,
          mimeType: file.mimetype,
          size: file.size,
          metadata: { public_id: publicId },
        });
        quoteIds.push(saved._id);
      }
    }

    const updateQuery = {};
    if (finIds.length) updateQuery['finForms.files'] = { $each: finIds };
    if (quoteIds.length) updateQuery['quotes.files'] = { $each: quoteIds };
    if (amount) updateQuery['quotes.amount'] = Number(amount);

    if (Object.keys(updateQuery).length > 0) {
      // If we are setting amount, we use $set for it, but for arrays we use $push if we wanted to append
      // But the logic above says "ALREADY_UPLOADED" if length > 0, so we are doing an initial set or overwrite.
      // However, the original code used array assignment: bid.finForms.files = finIds.
      // So we should use $set for the whole arrays since we checked they were empty.

      const setQuery = {};
      if (finIds.length) setQuery['finForms.files'] = finIds;
      if (quoteIds.length) setQuery['quotes.files'] = quoteIds;
      if (amount) setQuery['quotes.amount'] = Number(amount);

      await TenderBid.findOneAndUpdate(
        { tenderId, vendorId: userId },
        { $set: setQuery },
        { new: true }
      );
    }
    return true;
  },

  async getFinancialBidData(tenderId, userId) {
    const tender = await Tender.findById(tenderId);
    if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);
    if (tender.isBlocked) throw new Error('This tender has been blocked by admin');
    const bid = await TenderBid.findOne({ tenderId, vendorId: userId })
      .populate('finForms.files')
      .populate('quotes.files');
    if (!bid) throw new Error(ERROR_MESSAGES.NO_BID);
    if (bid.techReviewStatus === 'rejected') throw new Error(ERROR_MESSAGES.TECH_REJECTED);
    if (bid.techReviewStatus !== 'accepted') throw new Error(ERROR_MESSAGES.TECH_NOT_APPROVED);
    return {
      tender,
      bid,
      isTenderClosed: ['awarded', 'closed', 'completed'].includes(tender.status),
    };
  },
};
