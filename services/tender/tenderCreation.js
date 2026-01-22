const mongoose = require('mongoose');
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

  const useTransactions = process.env.NODE_ENV !== 'test';
  const session = useTransactions ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    const existingChecksums = await File.find({ relatedType: 'tender' })
      .session(session)
      .then((f) => f.map((x) => x.checksum));

    let existingTender = null;
    if (body.tenderId) {
      existingTender = await Tender.findById(body.tenderId).populate('files.fileId').session(session);
      if (existingTender?.files?.length) {
        existingTender.files.forEach(
          (f) => f.fileId?.checksum && existingChecksums.push(f.fileId.checksum)
        );
      }
    }

    const fileRefsTosave = [];
    if (files?.length) {
      for (const file of files) {
        if (!file.buffer) throw new Error(ERROR_MESSAGES.FILE_BUFFER_MISSING);

        const checksum = crypto.createHash('md5').update(file.buffer).digest('hex');
        if (existingChecksums.includes(checksum)) {
          throw new Error(ERROR_MESSAGES.DUPLICATE_TENDER_DOCUMENT);
        }
        existingChecksums.push(checksum);

        let cld;
        if (process.env.NODE_ENV === 'test') {
          cld = {
            secure_url: 'https://res.cloudinary.com/test/image.jpg',
            public_id: 'test_id',
            version: '1'
          };
        } else {
          cld = await new Promise((resolve, reject) => {
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
        }

        const fileDoc = await File.create(
          [
            {
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
            },
          ],
          { session }
        );

        fileRefsTosave.push({
          fileId: fileDoc[0]._id,
          originalName: file.originalname,
          size: file.size || file.buffer.length,
        });
      }
    }

    const tender = await Tender.create(
      [
        {
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
        },
      ],
      { session }
    );

    await File.updateMany(
      { _id: { $in: fileRefsTosave.map((f) => f.fileId) } },
      { $set: { relatedId: tender[0]._id } },
      { session }
    );

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }
    return tender[0];
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};
