const Tender = require('../../models/tender');
const FileModel = require('../../models/File');
const User = require('../../models/user');
const { uploadToCloudinary } = require('../../utils/cloudinaryHelper');
const { ERROR_MESSAGES } = require('../../utils/constants');
const statusCode = require('../../utils/statusCode');

exports.getAllTenders = async (page = 1) => {
  const limit = 8;
  const skip = (page - 1) * limit;
  const now = new Date();

  const tenders = await Tender.find({ status: 'published', bidEndAt: { $gt: now } })
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Tender.countDocuments({ status: 'published' });
  const totalPages = Math.ceil(total / limit);

  return {
    tenders,
    pagination: {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

exports.getTenderDetailsForUser = async (tenderId, user) => {
  const tender = await Tender.findById(tenderId).populate('createdBy', 'name role isVendor').lean();

  if (!tender) {
    const err = new Error('Tender not found');
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }

  const isVendor = !!(user && user.isVendor);

  let canViewFull = false;

  if (user && tender.createdBy && String(tender.createdBy._id) === String(user._id)) {
    canViewFull = true;
  }

  if (isVendor && ['published', 'closed', 'awarded'].includes(tender.status)) {
    canViewFull = true;
  }

  if (
    tender.status === 'draft' &&
    (!user || !tender.createdBy || String(tender.createdBy._id) !== String(user._id))
  ) {
    const err = new Error('This tender is not yet published.');
    err.statusCode = statusCode.FORBIDDEN;
    err.code = 'TENDER_DRAFT';
    throw err;
  }

  return {
    tender,
    isVendor,
    canViewFull,
  };
};
exports.getTenderForResubmit = async (tenderId) => {
  const tender = await Tender.findById(tenderId).lean();

  if (!tender) {
    const err = new Error('Tender not found');
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }

  return {
    tender,
    files: tender.files || [],
  };
};
exports.resubmitTenderService = async (tenderId, updatedData, uploadedFiles) => {
  const tender = await Tender.findById(tenderId);

  if (!tender) {
    const err = new Error('Tender not found');
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }

  tender.title = updatedData.title || tender.title;
  tender.dept = updatedData.dept || tender.dept;
  tender.category = updatedData.category || tender.category;
  tender.description = updatedData.description || tender.description;

  tender.eligibility = {
    categories: updatedData.eligibilityCategories
      ? updatedData.eligibilityCategories.split(',').map((x) => x.trim())
      : tender.eligibility.categories,
    minGrade: updatedData.eligibilityGrade || tender.eligibility.minGrade,
  };

  tender.emdAmount = updatedData.emdAmount || tender.emdAmount;
  tender.docFee = updatedData.docFee || tender.docFee;

  tender.publishAt = updatedData.publishAt || tender.publishAt;
  tender.bidStartAt = updatedData.bidStartAt || tender.bidStartAt;
  tender.bidEndAt = updatedData.bidEndAt || tender.bidEndAt;
  tender.techOpenAt = updatedData.techOpenAt || tender.techOpenAt;
  tender.finOpenAt = updatedData.finOpenAt || tender.finOpenAt;

  tender.status = 'draft';
  tender.adminComment = null;

  if (uploadedFiles && uploadedFiles.length > 0) {
    for (const file of uploadedFiles) {
      let url = file.path;
      let size = file.size;

      if (file.buffer) {
        const cld = await uploadToCloudinary(
          file.buffer,
          'nexabid/tenders',
          file.originalname,
          'auto'
        );
        url = cld.secure_url;
      }

      const saved = await FileModel.create({
        fileName: file.originalname,
        fileUrl: url,
        size: size,
        relatedType: 'tender',
        relatedId: tender._id,
      });

      tender.files.push({
        fileId: saved._id,
        fileName: saved.fileName,
        size: saved.size,
      });
    }
  }

  await tender.save();

  return tender;
};
