const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const File = require('../../models/File');
const Tender = require('../../models/tender');
const { ERROR_MESSAGES } = require('../../utils/constants');

exports.creatTenderService = async (user, body, files) => {
  if (!user || user.role !== 'vendor' || !user.isVendor) {
    throw new Error(ERROR_MESSAGES.ONLY_VERIFIED_VENDOR_CREATE_TENDER);
  }

  if (!body.title) throw new Error(ERROR_MESSAGES.TENDER_TITLE_REQUIRED);
  if (!body.dept) throw new Error(ERROR_MESSAGES.DEPARTMENT_REQUIRED);
  if (!body.category) throw new Error(ERROR_MESSAGES.CATEGORY_REQUIRED);
  if (!body.bidEndAt) throw new Error(ERROR_MESSAGES.BID_END_DATE_REQUIRED);

  const globalChecksums = await File.find({ relatedType: 'tender' }).then((files) =>
    files.map((f) => f.checksum)
  );

  let existingTenderChecksums = [];

  let existingTender = null;

  if (body.tenderId) {
    existingTender = await Tender.findById(body.tenderId).populate('files.fileId');

    if (existingTender?.files?.length > 0) {
      existingTenderChecksums = existingTender.files.map((f) => f.fileId.checksum || null);
    }
  }

  const existingFileSums = [...globalChecksums, ...existingTenderChecksums];

  const fileRefsTosave = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const filePath = path.join(__dirname, '../../uploads/tender-docs', file.filename);

      const fileBuffer = fs.readFileSync(filePath);
      const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

      if (existingFileSums.includes(checksum)) {
        console.log('duplicate document detected', file.filename);

        fs.unlinkSync(filePath);
        throw new Error(ERROR_MESSAGES.DUPLICATE_TENDER_DOCUMENT);
      }

      existingFileSums.push(checksum);

      const fileDoc = await File.create({
        ownerId: user._id,
        relatedType: 'tender',
        relatedId: null,
        fileName: file.filename,
        fileUrl: `/uploads/tender-docs/${file.filename}`,
        mimeType: file.mimetype,
        checksum,
        size: file.size,
      });
      fileRefsTosave.push({
        fileId: fileDoc._id,
        originalName: file.originalname,
        size: file.size,
      });
    }
  }

  const tender = await Tender.create({
    title: body.title,
    dept: body.dept,
    category: body.category,
    description: body.description || null,
    createdBy: user._id,
    eligibility: {
      categories: body.eligibilityCategories ? body.eligibilityCategories.split(',') : [],
      minGrade: body.eligibilityGrade || null,
    },
    type: body.type || 'open',
    emdAmount: body.emdAmount || null,
    docFee: body.docFee || null,
    publishAt: body.publishAt || new Date(),
    bidStartAt: body.bidStartAt || null,
    bidEndAt: body.bidEndAt,
    techOpenAt: body.techOpenAt || null,
    finOpenAt: body.finOpenAt || null,
    status: 'draft',
    files: fileRefsTosave,
  });
  await File.updateMany(
    { _id: { $in: fileRefsTosave.map((f) => f.fileId) } },
    { $set: { relatedId: tender._id } }
  );

  return tender;
};
