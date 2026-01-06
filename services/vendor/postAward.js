const cloudinary = require('../../config/cloudinary');
const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const PO = require('../../models/purchaseOrder');
const Agreement = require('../../models/agreement');
const WorkOrder = require('../../models/workOrder');
const File = require('../../models/File');
const { ERROR_MESSAGES } = require('../../utils/constants');
const generateWorkOrderPDF = require('./workOrderPdf');
// ------------------ HELPER ------------------
const upload = (buffer, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ resource_type: 'raw', folder }, (e, r) => (e ? reject(e) : resolve(r)))
      .end(buffer);
  });

// ------------------ DASHBOARD ------------------
exports.getPublisherPostAwardService = async (tenderId, userId) => {
  const wo = await WorkOrder.findOne({ tenderId });
  if (wo) {
    return {
      redirectToTracking: true,
      workOrderId: wo._id,
    };
  }

  const tender = await Tender.findById(tenderId);
  if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);
  if (tender.createdBy.toString() !== userId.toString())
    throw new Error(ERROR_MESSAGES.UNAUTHORIZED);

  if (tender.status !== 'awarded') {
    return {
      redirectToEvaluation: true,
      url: `/user/status/my-listing/owner/tender/${tenderId}/evaluation`,
    };
  }

  const winnerBid = await TenderBid.findOne({ tenderId, isWinner: true }).populate('vendorId');
  if (!winnerBid) throw new Error(ERROR_MESSAGES.NO_WINNER_FOUND);

  const po = await PO.findOne({ tenderId }).sort({ createdAt: -1 });
  const agreement = await Agreement.findOne({ tenderId })
    .populate('publisherAgreement')
    .populate('uploadedByVendor');
  const workOrder = await WorkOrder.findOne({ tenderId });
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
    vendorAccepted: po?.status === 'vendor_accepted',
    agreementSigned: !!agreement?.uploadedByVendor,
    agreement,
    workOrderIssued: !!workOrder,
    workOrder,
    wo,
  };
};

// ------------------ AGREEMENT UPLOAD ------------------
exports.uploadPublisherAgreement = async ({ tenderId, publisherId, file }) => {
  const latestPO = await PO.findOne({ tenderId }).sort({ createdAt: -1 });

  if (!latestPO || latestPO.status !== 'vendor_accepted') {
    throw new Error(ERROR_MESSAGES.PO_NOT_ACCEPTED_YET);
  }
  if (!file?.buffer) throw new Error(ERROR_MESSAGES.NO_FILE);

  const winnerBid = await TenderBid.findOne({ tenderId, isWinner: true });
  if (!winnerBid) throw new Error(ERROR_MESSAGES.WINNER_NOT_FOUND);

  const cld = await upload(file.buffer, 'post_award/agreements');

  const fileDoc = await File.create({
    ownerId: publisherId,
    fileName: file.originalname,
    fileUrl: cld.secure_url,
    mimeType: file.mimetype,
    size: file.size,
    metadata: { public_id: cld.public_id },
  });

  let agreement = await Agreement.findOne({ tenderId });
  if (!agreement) {
    agreement = await Agreement.create({
      tenderId,
      vendorId: winnerBid.vendorId,
      publisherAgreement: fileDoc._id,
    });
  } else {
    agreement.publisherAgreement = fileDoc._id;
    await agreement.save();
  }
  return true;
};

exports.viewAgreementFile = async (fileId) => {
  const file = await File.findById(fileId);
  console.log('file', file);
  if (!file?.fileUrl) throw new Error(ERROR_MESSAGES.FILE_NOT_FOUND);
  return file.fileUrl;
};

exports.issueWorkOrder = async (publisherId, tenderId, body, _file) => {
  // Hard lock — one WO per tender
  const existingWO = await WorkOrder.findOne({ tenderId });
  if (existingWO) throw new Error(ERROR_MESSAGES.WORK_ORDER_ALREADY_ISSUED);

  const tender = await Tender.findOne({
    _id: tenderId,
    status: 'awarded',
    createdBy: publisherId,
  });
  if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);

  const winnerBid = await TenderBid.findOne({ tenderId, isWinner: true }).populate('vendorId');
  if (!winnerBid) throw new Error(ERROR_MESSAGES.WINNER_NOT_FOUND);

  const agreement = await Agreement.findOne({ tenderId });
  if (!agreement || !agreement.uploadedByVendor)
    throw new Error(ERROR_MESSAGES.AGREEMENT_NOT_SIGNED);

  /* ================= Build Milestones ================= */
  let milestones = [];
  if (Array.isArray(body.milestones)) {
    milestones = body.milestones.map((m) => ({
      description: m.description,
      dueDate: m.dueDate,
      status: 'scheduled',
    }));
  }

  const woNumber = `WO-${Date.now()}`;

  /* ================= Generate PDF ================= */
  const cld = await generateWorkOrderPDF({
    tender,
    vendor: winnerBid.vendorId,
    body,
    woNumber,
  });

  const fileDoc = await File.create({
    ownerId: publisherId,
    fileName: `${woNumber}.pdf`,
    fileUrl: cld.secure_url,
    mimeType: 'application/pdf',
    size: cld.bytes,
    metadata: { public_id: cld.public_id },
  });

  /* ================= Create Work Order ================= */
  const wo = await WorkOrder.create({
    tenderId,
    vendorId: winnerBid.vendorId._id,
    issuedBy: publisherId,

    woNumber,
    contractRef: body.contractRef,

    title: body.title,
    description: body.description,

    value: body.value,
    startDate: body.startDate,
    completionDate: body.completionDate,

    milestones,
    pdfFile: fileDoc._id,
    status: 'active',
  });

  tender.lifecycle = 'work_order_issued';
  await tender.save();

  return wo;
};

// ------------------ WORK ORDER VIEW ------------------
exports.getWorkOrderFilePath = async (fileId) => {
  const file = await File.findById(fileId);
  console.log(file);
  if (!file || !file.fileUrl) {
    throw new Error(ERROR_MESSAGES.WORK_ORDER_NOT_FOUND);
  }

  return file.fileUrl;
};

exports.approveAgreement = async (agreementId) => {
  const agreement = await Agreement.findByIdAndUpdate(
    agreementId,
    { approvedByPublisher: true },
    { new: true }
  );

  if (!agreement) {
    throw new Error('AGREEMENT_NOT_FOUND');
  }

  return agreement;
};

exports.rejectAgreement = async ({ agreementId, remarks }) => {
  const agreement = await Agreement.findByIdAndUpdate(
    agreementId,
    {
      approvedByPublisher: false,
      publisherRemarks: remarks || '',
    },
    { new: true }
  );

  if (!agreement) {
    throw new Error('AGREEMENT_NOT_FOUND');
  }

  return agreement;
};

exports.getIssuePageData = async (publisherId, tenderId) => {
  const tender = await Tender.findOne({
    _id: tenderId,
    status: 'awarded',
    createdBy: publisherId,
  }).lean();

  if (!tender) throw new Error('TENDER_NOT_FOUND');

  const winnerBid = await TenderBid.findOne({
    tenderId,
    isWinner: true,
  }).populate('vendorId', 'name email');

  if (!winnerBid) throw new Error('WINNER_NOT_FOUND');

  const existingWO = await WorkOrder.findOne({ tenderId });
  if (existingWO) throw new Error('WORK_ORDER_ALREADY_ISSUED');

  return {
    tender,
    vendor: winnerBid.vendorId,
    contractRef: `CTR-${tender._id.toString().slice(-6)}`,
  };
};

exports.getTrackingData = async (workOrderId) => {
  console.log(workOrderId);
  const wo = await WorkOrder.findById(workOrderId)
    .populate('vendorId', 'name email')
    .populate('tenderId', 'title')
    .populate('notes.author', 'name')
    .populate('pdfFile');

  console.log(wo);
  if (!wo) return { redirectToPostAward: true };
  return wo;
};
exports.addNote = async (workOrderId, userId, content) => {
  return WorkOrder.findByIdAndUpdate(
    workOrderId,
    { $push: { notes: { author: userId, content } } },
    { new: true }
  );
};

exports.reviewMilestone = async (workOrderId, milestoneId, action, comment) => {
  const wo = await WorkOrder.findById(workOrderId);
  const m = wo.milestones.id(milestoneId);
  if (action === 'approve') {
    m.status = 'completed';
    m.approvedAt = new Date();
  } else {
    m.status = 'in_progress';
    m.vendorUpdate = comment;
  }
  await wo.save();
};

exports.approveProof = async (woId, proofId) => {
  const wo = await WorkOrder.findById(woId);
  if (!wo) throw new Error('WORK_ORDER_NOT_FOUND');

  const proof = wo.vendorProofs.id(proofId);
  if (!proof) throw new Error('PROOF_NOT_FOUND');

  proof.status = 'approved';
  await wo.save();
};

exports.rejectProof = async (workOrderId, proofId, reason) => {
  const wo = await WorkOrder.findById(workOrderId);
  const proof = wo.vendorProofs.id(proofId);
  proof.status = 'rejected';
  proof.reason = reason;
  await wo.save();
};

exports.completeWorkOrder = async (workOrderId) => {
  const wo = await WorkOrder.findById(workOrderId);
  if (!wo.milestones.every((m) => m.status === 'completed'))
    throw new Error('COMPLETE_ALL_MILESTONES_FIRST');

  wo.status = 'completed';
  await wo.save();
};
