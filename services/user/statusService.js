const Property = require('../../models/property');
const Tender = require('../../models/tender');
const File = require('../../models/File');
const { ERROR_MESSAGES } = require('../../utils/constants');
const statusCode = require('../../utils/statusCode');
exports.getPropertyStatus = async (userId) => {
  const properties = await Property.find({
    sellerId: userId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();
  return {
    properties,
  };
};
exports.getTenderStatus = async (userId) => {
  const tenders = await Tender.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
  return {
    tenders,
  };
};
exports.deleteTender = async (tenderId, userId) => {
  const tender = await Tender.findOne({
    _id: tenderId,
    createdBy: userId,
  });
  if (!tender) {
    const error = new Error(ERROR_MESSAGES.TENDER_NOT_FOUND_UNAUTHORIZED);
    error.statusCode = statusCode.NOT_FOUND;
    throw error;
  }
  const fileIds = tender.files.map((f) => f.fileId);
  if (fileIds.length > 0) {
    await File.deleteMany({ _id: { $in: fileIds } });
  }
  await Tender.deleteOne({ _id: tenderId });
  return { success: true };
};
