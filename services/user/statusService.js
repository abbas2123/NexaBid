const Property = require('../../models/property');
const Tender = require('../../models/tender');
const File = require('../../models/File');
const { ERROR_MESSAGES } = require('../../utils/constants');
const statusCode = require('../../utils/statusCode');
exports.getPropertyStatus = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const query = {
    sellerId: userId,
    deletedAt: null,
  };

  const total = await Property.countDocuments(query);
  const properties = await Property.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    properties,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};
exports.getTenderStatus = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const query = { createdBy: userId };

  const total = await Tender.countDocuments(query);
  const tenders = await Tender.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    tenders,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
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
