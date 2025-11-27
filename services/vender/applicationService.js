const vendorApplication = require('../../models/vendorApplication');
const OCRResult = require('../../models/OCR_Result');
const FraudFlag = require('../../models/fraudFlag');
const fileModel = require('../../models/File');
const ocrService = require('../../utils/ocr');
const fraudService = require('../../utils/fraudFlag');
const path = require('path');
const fs = require('fs');
const crypto = require("crypto");

exports.checkExistingApplication = async (userId) => {
  return vendorApplication
    .findOne({ userId })
    .populate("documents.fileId");
};
exports.getApplicationStatus = async (userId) => {
  return await vendorApplication
    .findOne({ userId })
    .populate("documents.fileId")
    .populate("ocrResultId");
};

exports.submitApplicationService = async (user, files, actionType) => {

  if (actionType !== "scan") {
    return {
      updatedApp: await vendorApplication.findOne({ userId: user._id }).populate("documents.fileId"),
      extracted: null,
      fraud: null
    };
  }
if(actionType==="scan"){
  if (!files || files.length === 0){
    throw new Error("Upload at least 1 document");
}
}
  const existingApp = await vendorApplication.findOne({ userId: user._id }) || {};
  const applicationHasOCR = existingApp?.ocrResultId ? true : false;

  // Load existing checksums
  const existingFileChecksums = await fileModel.find({
    _id: { $in: existingApp.documents?.map(d => d.fileId) || [] }
  }).then(docs => docs.map(f => f.checksum));

  let newDocs = [];

  let extractedData = {
  businessName: null,
  panNumber: null,
  gstNumber: null,
  text: ""
};


  for (let file of files) {

    const filePath = path.join(__dirname, "../../uploads/vendor-docs", file.filename);

    const fileBuffer = fs.readFileSync(filePath);
    const checksum = crypto.createHash("md5").update(fileBuffer).digest("hex");

    // DUPLICATE PREVENTION — even inside single upload batch
    if (existingFileChecksums.includes(checksum)) {
      console.log("⛔ Duplicate prevented:", file.filename);
      fs.unlinkSync(filePath);
      continue;
    }

    // Add checksum to prevent duplicates in same upload
    existingFileChecksums.push(checksum);

    // Create file metadata
    const fileData = await fileModel.create({
      ownerId: user._id,
      relatedType: "vendor_application",
      relatedId: existingApp?._id || null,
      fileName: file.filename,
      fileUrl: `/uploads/vendor-docs/${file.filename}`,
      mimeType: file.mimetype,
      checksum
    });

    newDocs.push({
      fileId: fileData._id,
      type: file.mimetype,
      uploadedAt: new Date()
    });

    const ocrResult = await ocrService.extractTextFromImage(filePath);
  extractedData.text += "\n" + (ocrResult.text || "");

  // 🔍 Merge OCR fields  
  if (!extractedData.businessName && ocrResult.businessName)
    extractedData.businessName = ocrResult.businessName;

  if (!extractedData.panNumber && ocrResult.panNumber)
    extractedData.panNumber = ocrResult.panNumber;

  if (!extractedData.gstNumber && ocrResult.gstNumber)
    extractedData.gstNumber = ocrResult.gstNumber;
}
if (newDocs.length > 0) {
    await vendorApplication.findOneAndUpdate(
      { userId: user._id },
      { $push: { documents: { $each: newDocs } } },
      { upsert: true }
    );
  }
    const  latestOCR_DB = await OCRResult.create({
        fileId: newDocs[0]?.fileId,
        ownerId: user._id,
        extracted:extractedData,
        status: "processed"
      });

     const fraudResult = await fraudService.detectFraud(extractedData) || {};
      fraudResult.flags = fraudResult.flags || [];
      fraudResult.severity = fraudResult.severity || "low";

      await FraudFlag.create({
        entityType: "vendor_application",
        entityId: latestOCR_DB._id,
        flags: fraudResult.flags,
        severity: fraudResult.severity
      });

      await vendorApplication.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            businessName: existingApp.businessName || extractedData.businessName || null,
            panNumber: existingApp.panNumber || extractedData.panNumber || null,
            gstNumber: existingApp.gstNumber || extractedData.gstNumber || null,   
            ocrResultId: latestOCR_DB._id
          }
        },
        { upsert: true }
      );
    const updatedApp = await vendorApplication
    .findOne({ userId: user._id })
    .populate("documents.fileId");

  return { updatedApp, extracted: extractedData, fraud: fraudResult };
};