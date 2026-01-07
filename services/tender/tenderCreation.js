const crypto = require('crypto');
const cloudinary = require('../../config/cloudinary');
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

  // Get all existing tender checksums
  const existingChecksums = await File.find({ relatedType: 'tender' }).then((f) =>
    f.map((x) => x.checksum)
  );

  let existingTender = null;
  if (body.tenderId) {
    existingTender = await Tender.findById(body.tenderId).populate('files.fileId');
    if (existingTender?.files?.length) {
      existingTender.files.forEach(
        (f) => f.fileId?.checksum && existingChecksums.push(f.fileId.checksum)
      );
    }
  }

  const fileRefsTosave = [];

  if (files?.length) {
    for (const file of files) {
      if (!file.buffer) throw new Error('File buffer missing');

    
      const checksum = crypto.createHash('md5').update(file.buffer).digest('hex');
      if (existingChecksums.includes(checksum)) {
        throw new Error(ERROR_MESSAGES.DUPLICATE_TENDER_DOCUMENT);
      }
      existingChecksums.push(checksum);

    
      const cld = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: 'auto',
              folder: 'tender_docs',
            },
            (err, result) => (err ? reject(err) : resolve(result))
          )
          .end(file.buffer);
      });

      // 3️⃣ FILE DB RECORD
      const fileDoc = await File.create({
        ownerId: user._id,
        relatedType: 'tender',
        relatedId: null,
        fileName: file.originalname,
        fileUrl: cld.secure_url,
        mimeType: file.mimetype,
        checksum,
        size: file.size || file.buffer.length,
        version: 1,
        metadata: {
          cloudinary_public_id: cld.public_id,
          cloudinary_version: cld.version,
        },
      });

      fileRefsTosave.push({
        fileId: fileDoc._id,
        originalName: file.originalname,
        size: file.size || file.buffer.length,
      });
    }
  }

  // CREATE TENDER
  const tender = await Tender.create({
    title: body.title,
    dept: body.dept,
    category: body.category,
    description: body.description || null,
    createdBy: user._id,
    eligibility: {
      categories: body.eligibilityCategories?.split(',') || [],
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

  // Attach file relations
  await File.updateMany(
    { _id: { $in: fileRefsTosave.map((f) => f.fileId) } },
    { $set: { relatedId: tender._id } }
  );

  return tender;
};
