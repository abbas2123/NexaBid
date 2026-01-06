const Tender = require('../../models/tender');
const FileModel = require('../../models/File');
const statusCode = require('../../utils/statusCode');

exports.getAllTenders = async (page = 1) => {
  const limit = 8; // tenders per page
  const skip = (page - 1) * limit;
  const now = new Date();
  // Fetch tenders (only published)
  const tenders = await Tender.find({ status: 'published', bidEndAt: { $gt: now } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Pagination data
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
  // 1️⃣ Fetch tender with creator info
  const tender = await Tender.findById(tenderId).populate('createdBy', 'name role isVendor').lean();

  if (!tender) {
    const err = new Error('Tender not found');
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }

  // 2️⃣ Is this user a verified vendor?
  const isVendor = !!(user && user.isVendor);

  // 3️⃣ Decide access level
  let canViewFull = false;

  // ✅ Creator always has full access
  if (user && tender.createdBy && String(tender.createdBy._id) === String(user._id)) {
    canViewFull = true;
  }

  // ✅ Any verified vendor can see full details if tender is published
  if (isVendor && ['published', 'closed', 'awarded'].includes(tender.status)) {
    canViewFull = true;
  }

  // ❌ If tender is still draft and user is NOT creator → block
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

  // Update basic fields
  tender.title = updatedData.title || tender.title;
  tender.dept = updatedData.dept || tender.dept;
  tender.category = updatedData.category || tender.category;
  tender.description = updatedData.description || tender.description;

  // Update eligibility
  tender.eligibility = {
    categories: updatedData.eligibilityCategories
      ? updatedData.eligibilityCategories.split(',').map((x) => x.trim())
      : tender.eligibility.categories,
    minGrade: updatedData.eligibilityGrade || tender.eligibility.minGrade,
  };

  // Financial update
  tender.emdAmount = updatedData.emdAmount || tender.emdAmount;
  tender.docFee = updatedData.docFee || tender.docFee;

  // Dates update
  tender.publishAt = updatedData.publishAt || tender.publishAt;
  tender.bidStartAt = updatedData.bidStartAt || tender.bidStartAt;
  tender.bidEndAt = updatedData.bidEndAt || tender.bidEndAt;
  tender.techOpenAt = updatedData.techOpenAt || tender.techOpenAt;
  tender.finOpenAt = updatedData.finOpenAt || tender.finOpenAt;

  // Reset status for verification again
  tender.status = 'draft';
  tender.adminComment = null;

  // If user attached new files
  if (uploadedFiles && uploadedFiles.length > 0) {
    for (const file of uploadedFiles) {
      const saved = await FileModel.create({
        fileName: file.originalname,
        fileUrl: file.path,
        size: file.size,
        relatedType: 'tender',
        relatedId: tender._id,
      });
      tender.files.push({
        fileId: saved._id, // must be object
        fileName: saved.fileName,
        size: saved.size,
      });
      console.log('file', tender.files);
    }
  }

  await tender.save();

  return tender;
};
