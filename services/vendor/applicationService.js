const crypto = require('crypto');

const cloudinary = require('../../config/cloudinary');
const vendorApplication = require('../../models/vendorApplication');
const OCRResult = require('../../models/OCR_Result');
const FraudFlag = require('../../models/fraudFlag');
const File = require('../../models/File');
const ocrService = require('../../utils/ocr');
const fraudService = require('../../utils/fraudFlag');
const { ERROR_MESSAGES } = require('../../utils/constants');

exports.getApplicationStatus = async (userId) =>
  vendorApplication.findOne({ userId }).populate('documents.fileId').populate('ocrResultId');

exports.checkExistingApplication = async (userId) =>
  vendorApplication.findOne({ userId }).populate('documents.fileId');

exports.submitApplicationService = async (user, files, actionType) => {
  if (actionType !== 'scan') {
    return {
      updatedApp: await vendorApplication
        .findOne({ userId: user._id })
        .populate('documents.fileId'),
      extracted: null,
      fraud: null,
    };
  }

  if (!files || files.length === 0) {
    throw new Error(ERROR_MESSAGES.UPLOAD_AT_LEAST_ONE_DOC);
  }

  const existingApp = (await vendorApplication.findOne({ userId: user._id })) || {};

  const globalChecksums = await File.find({ relatedType: 'vendor_application' }).then((files) =>
    files.map((f) => f.checksum)
  );

  const existingFileChecksums = await File.find({
    _id: { $in: existingApp.documents?.map((d) => d.fileId) || [] },
  }).then((docs) => docs.map((f) => f.checksum));

  const existingChecksums = [...globalChecksums, ...existingFileChecksums];

  const newDocs = [];
  const extractedData = {
    businessName: null,
    panNumber: null,
    gstNumber: null,
    text: '',
  };

  for (const file of files) {
    if (!file.buffer) {
      throw new Error('Upload failed: file buffer missing');
    }

    const checksum = crypto.createHash('md5').update(file.buffer).digest('hex');

    if (existingChecksums.includes(checksum)) {
      throw new Error(ERROR_MESSAGES.DUPLICATE_DOCUMENT);
    }

    existingChecksums.push(checksum);

    const cldResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'vendor_docs',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(file.buffer);
    });

    const fileData = await File.create({
      ownerId: user._id,
      relatedType: 'vendor_application',
      relatedId: existingApp?._id || null,
      fileName: file.originalname,
      fileUrl: cldResult.secure_url,
      checksum,
      mimeType: file.mimetype,
      size: file.size || file.buffer.length,
      version: 1,
      metadata: {
        cloudinary_public_id: cldResult.public_id,
        cloudinary_version: cldResult.version,
      },
    });

    newDocs.push({
      fileId: fileData._id,
      type: file.mimetype,
      uploadedAt: new Date(),
    });

    const ocrResult = await ocrService.extractTextFromImage(cldResult.secure_url);
    extractedData.text += `\n${ocrResult.text || ''}`;

    if (!extractedData.businessName && ocrResult.businessName) {
      extractedData.businessName = ocrResult.businessName;
    }
    if (!extractedData.panNumber && ocrResult.panNumber) {
      extractedData.panNumber = ocrResult.panNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }
    if (!extractedData.gstNumber && ocrResult.gstNumber) {
      extractedData.gstNumber = ocrResult.gstNumber;
    }
  }

  if (newDocs.length > 0) {
    await vendorApplication.findOneAndUpdate(
      { userId: user._id },
      { $push: { documents: { $each: newDocs } } },
      { upsert: true }
    );
  }

  let ocrFileId = newDocs[0]?.fileId;
  if (!ocrFileId && existingApp?.documents?.length > 0) {
    ocrFileId = existingApp.documents[existingApp.documents.length - 1].fileId;
  }
  if (!ocrFileId) {
    throw new Error(ERROR_MESSAGES.CANNOT_RUN_OCR);
  }

  const latestOCR_DB = await OCRResult.create({
    fileId: ocrFileId,
    ownerId: user._id,
    extracted: extractedData,
    status: 'processed',
  });

  const fraudResult = (await fraudService.detectFraud(extractedData)) || {};
  fraudResult.flags = fraudResult.flags || [];
  fraudResult.severity = fraudResult.severity || 'low';

  await FraudFlag.create({
    entityType: 'vendor_application',
    entityId: latestOCR_DB._id,
    flags: fraudResult.flags,
    severity: fraudResult.severity,
  });

  await vendorApplication.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        businessName: existingApp.businessName || extractedData.businessName || null,
        panNumber: existingApp.panNumber || extractedData.panNumber || null,
        gstNumber: existingApp.gstNumber || extractedData.gstNumber || null,
        ocrResultId: latestOCR_DB._id,
      },
    },
    { upsert: true }
  );

  const updatedApp = await vendorApplication
    .findOne({ userId: user._id })
    .populate('documents.fileId');

  return { updatedApp, extracted: extractedData, fraud: fraudResult };
};
