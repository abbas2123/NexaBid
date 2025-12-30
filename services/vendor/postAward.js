const Tender = require("../../models/tender");
const TenderBid = require("../../models/tenderBid");
const notification = require("../notificationService");
const PO = require("../../models/purchaseOrder");
const Agreement = require("../../models/agreement");
const WorkOrder = require("../../models/workOrder");
const path = require("path");
const File = require("../../models/File");
const tender = require("../../models/tender");


 exports.getPublisherPostAwardService = async (tenderId, userId) => {
  const tender = await Tender.findById(tenderId);
  if (!tender) throw new Error("TENDER_NOT_FOUND");

  if (tender.createdBy.toString() !== userId.toString()) {
    throw new Error("UNAUTHORIZED");
  }

  if (tender.status !== "awarded") {
    return {
      redirectToEvaluation: true,
      url: `/user/status/my-listing/owner/tender/${tenderId}/evaluation`,
    };
  }

  const winnerBid = await TenderBid.findOne({
    tenderId,
    isWinner: true,
  }).populate("vendorId");

  if (!winnerBid) throw new Error("NO_WINNER_FOUND");

  const po = await PO.findOne({ tenderId });
 const agreement = await Agreement.findOne({ tenderId })
    .populate("publisherAgreement")
    .populate("uploadedByVendor");
  const workOrder = await WorkOrder.findOne({ tenderId });

  let vendorAccepted = false;
  if (po) {
    if (po.status === "vendor_accepted") vendorAccepted = true;
    else if (po.status === "vendor_rejected") vendorAccepted = "rejected";
    else vendorAccepted = false; 
  }

  return {
    redirectToEvaluation: false,
    tender,
    winner: {
      vendorName: winnerBid.vendorId.name,
      vendorEmail: winnerBid.vendorId.email,
      amount: winnerBid.quotes.amount,
    },
    poGenerated: !!po,
    po,
    vendorAccepted,
    agreementSigned: !!agreement?.uploadedByVendor,
    agreement,
    workOrderIssued: !!workOrder,
    workOrder,
  };
};


exports.uploadPublisherAgreement = async ({ tenderId, publisherId, file }) => {
  if (!file) {
    throw new Error("NO_FILE");
  }

  
  const winnerBid = await TenderBid.findOne({
    tenderId,
    isWinner: true,
  });

  if (!winnerBid) {
    throw new Error("WINNER_NOT_FOUND");
  }

  const vendorId = winnerBid.vendorId;

  
  const fileData = await File.create({
    fileName: file.filename,
    originalName: file.originalname,
    fileUrl: `/uploads/agreement/${file.filename}`,
    uploadedBy: publisherId,
  });

  
  let agreement = await Agreement.findOne({ tenderId });

  if (!agreement) {
    agreement = await Agreement.create({
      tenderId,
      vendorId,
      publisherAgreement: fileData._id,
    });
  } else {
    agreement.publisherAgreement = fileData._id;
    await agreement.save();
  }

  return true;
};


exports.viewAgreementFile = async (fileId) => {
  const file = await File.findById(fileId);
  if (!file) {
    throw new Error("FILE_NOT_FOUND");
  }

  const absolutePath = path.join(
    process.cwd(),
    file.fileUrl.replace("/uploads", "uploads")
  );

  return absolutePath;
};


exports.approveAgreement = async (agreementId) => {
  const agreement = await Agreement.findByIdAndUpdate(
    agreementId,
    { approvedByPublisher: true },
    { new: true }
  );

  if (!agreement) {
    throw new Error("AGREEMENT_NOT_FOUND");
  }
 

  return agreement;
};


exports.rejectAgreement = async ({ agreementId, remarks }) => {
  const agreement = await Agreement.findByIdAndUpdate(
    agreementId,
    {
      approvedByPublisher: false,
      publisherRemarks: remarks || "",
    },
    { new: true }
  );

  if (!agreement) {
    throw new Error("AGREEMENT_NOT_FOUND");
  }

  return agreement;
};





exports.getIssuePageData = async (publisherId, tenderId) => {
  const tender = await Tender.findOne({
    _id: tenderId,
    status: "awarded",
    createdBy: publisherId
  }).lean();

  if (!tender) throw new Error("TENDER_NOT_FOUND");

  const winnerBid = await TenderBid.findOne({
    tenderId,
    isWinner: true
  }).populate("vendorId", "name email");

  if (!winnerBid) throw new Error("WINNER_NOT_FOUND");

  const existingWO = await WorkOrder.findOne({ tenderId });
  if (existingWO) throw new Error("WORK_ORDER_ALREADY_ISSUED");

  return {
    tender,
    vendor: winnerBid.vendorId,
    contractRef: `CTR-${tender._id.toString().slice(-6)}`
  };
};


exports.issueWorkOrder = async (
  publisherId,
  tenderId,
  body,
  file
) => {

  if (!file) throw new Error("WORK_ORDER_PDF_REQUIRED");
  if (!body.description) throw new Error("WORK_ORDER_DESCRIPTION_REQUIRED");

  const tender = await Tender.findOne({
    _id: tenderId,
    status: "awarded",
    createdBy: publisherId
  });

  if (!tender) throw new Error("TENDER_NOT_FOUND");

  const winnerBid = await TenderBid.findOne({
    tenderId,
    isWinner: true
  });

  if (!winnerBid) throw new Error("WINNER_NOT_FOUND");

  // ✅ Save file
  const fileDoc = await File.create({
    originalName: file.originalname,
    fileUrl: `/uploads/agreement/${file.filename}`,
    uploadedBy: publisherId,
    fileName: "work_order",
    relatedId:null,
  });
console.log("fhbwhbv",fileDoc)
  // ✅ Generate WO Number
  const woNumber = `WO-${Date.now()}`;

  // ✅ Create Work Order (CORRECT FIELDS)
 const work = await WorkOrder.create({
    tenderId,
    vendorId: winnerBid.vendorId,
    issuedBy: publisherId,
    woNumber,
    description: body.description,
    pdfFile: fileDoc._id,
    status: "issued"
  });

  fileDoc.relatedId = work._id
  await fileDoc.save();
  // ✅ Update tender lifecycle (optional but correct)
  tender.lifecycle = "work_order_issued";
  await tender.save();

  return true;
};


exports.getWorkOrderFilePath = async (publisherId, fileId) => {
  const workOrder =  await File.findOne({
    _id: fileId,
    fileName: "work_order"
  });
    console.log("fwdvwv",workOrder)

  if (!workOrder) {
    throw new Error("WORK_ORDER_NOT_FOUND");
  }
if (!workOrder.fileUrl) {
    throw new Error("FILE_URL_MISSING");
  }
  return path.join(
  process.cwd(),
  workOrder.fileUrl.replace("/uploads", "uploads")
);
};