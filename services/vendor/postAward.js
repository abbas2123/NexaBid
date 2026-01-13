const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const PO = require('../../models/purchaseOrder');
const Agreement = require('../../models/agreement');
const WorkOrder = require('../../models/workOrder');
const File = require('../../models/File');
const { ERROR_MESSAGES } = require('../../utils/constants');
const statusCode = require('../../utils/statusCode');
const generateWorkOrderPDF = require('./workOrderPdf');
const { uploadToCloudinary, generateSignedUrl } = require('../../utils/cloudinaryHelper');
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
      url: `/ vendor / tender / ${tender._id}/evaluation`,
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
    vendorAccepted: po
      ? po.status === 'vendor_accepted'
        ? true
        : po.status === 'vendor_rejected'
          ? false
          : null
      : null,
    agreementSigned: !!agreement?.uploadedByVendor,
    agreement,
    workOrderIssued: !!workOrder,
    workOrder,
    wo,
  };
};
exports.getPublisherAgreementUploadData = async (tenderId, publisherId) => {
  const tender = await Tender.findById(tenderId);
  if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);
  if (tender.createdBy.toString() !== publisherId.toString())
    throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
  const po = await PO.findOne({ tenderId, status: 'vendor_accepted' });
  if (!po) throw new Error(ERROR_MESSAGES.PO_NOT_ACCEPTED);
  const agreement = await Agreement.findOne({ tenderId })
    .populate('publisherAgreement')
    .populate('uploadedByVendor');
  return {
    publisherAgreement: agreement?.publisherAgreement,
    vendorAgreement: agreement?.uploadedByVendor,
    approved: agreement?.approvedByPublisher,
    remarks: agreement?.publisherRemarks,
  };
};
exports.uploadPublisherAgreement = async ({ tenderId, publisherId, file }) => {
  const latestPO = await PO.findOne({ tenderId }).sort({ createdAt: -1 });
  if (!latestPO || latestPO.status !== 'vendor_accepted') {
    throw new Error(ERROR_MESSAGES.PO_NOT_ACCEPTED_YET);
  }
  if (!file) throw new Error(ERROR_MESSAGES.NO_FILE);
  const winnerBid = await TenderBid.findOne({ tenderId, isWinner: true });
  if (!winnerBid) throw new Error(ERROR_MESSAGES.WINNER_NOT_FOUND);
  const cld = await uploadToCloudinary(
    file.buffer,
    'post_award/agreements',
    file.originalname,
    'auto'
  );
  const fileDoc = await File.create({
    ownerId: publisherId,
    fileName: file.originalname,
    fileUrl: cld.secure_url,
    mimeType: file.mimetype,
    size: file.size,
    metadata: {
      public_id: cld.public_id,
      resource_type: cld.resource_type,
      type: cld.type,
      version: cld.version,
    },
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
  if (!file?.fileUrl) throw new Error(ERROR_MESSAGES.FILE_NOT_FOUND);
  const resourceType = file.metadata?.resource_type === 'raw' ? 'raw' : 'image';
  const url = generateSignedUrl(
    file.metadata.public_id,
    file.version,
    resourceType,
    file.mimeType === 'application/pdf' ? 'pdf' : null
  );
  return url || file.fileUrl;
};
exports.issueWorkOrder = async (publisherId, tenderId, body, _file) => {
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
  let milestones = [];
  if (Array.isArray(body.milestones)) {
    milestones = body.milestones.map((m) => ({
      description: m.description,
      dueDate: m.dueDate,
      status: 'scheduled',
    }));
  }
  const woNumber = `WO-${Date.now()}`;
  const cld = await generateWorkOrderPDF({
    tender,
    vendor: winnerBid.vendorId,
    body,
    woNumber,
  });
  const fileDoc = await File.create({
    ownerId: publisherId,
    fileName: `WorkOrder-${woNumber}.pdf`,
    fileUrl: cld.secure_url,
    mimeType: 'application/pdf',
    size: cld.bytes,
    metadata: { public_id: cld.public_id },
  });
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
exports.getWorkOrderFilePath = async (fileId) => {
  const file = await File.findById(fileId);
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
  if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);
  const winnerBid = await TenderBid.findOne({
    tenderId,
    isWinner: true,
  }).populate('vendorId', 'name email');
  if (!winnerBid) throw new Error(ERROR_MESSAGES.WINNER_NOT_FOUND);
  const existingWO = await WorkOrder.findOne({ tenderId });
  if (existingWO) throw new Error(ERROR_MESSAGES.WORK_ORDER_ALREADY_ISSUED);
  return {
    tender,
    vendor: winnerBid.vendorId,
    contractRef: `${tender.title}-Contract`,
    amount: winnerBid.quotes.amount,
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
  if (!m) throw new Error(ERROR_MESSAGES.MILESTONE_NOT_FOUND);
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
  if (!wo) throw new Error(ERROR_MESSAGES.WORK_ORDER_NOT_FOUND);
  const proof = wo.vendorProofs.id(proofId);
  if (!proof) throw new Error(ERROR_MESSAGES.PROOF_NOT_FOUND);
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
    throw new Error(ERROR_MESSAGES.COMPLETE_ALL_MILESTONES_FIRST);
  wo.status = 'completed';
  await wo.save();
  return wo;
};
exports.getCompletionSummary = async (WorkOrderId) => {
  console.log('[DEBUG] getCompletionSummary Service. ID:', WorkOrderId);
  const workOrderId = WorkOrderId.replace('completion-', '');
  console.log('[DEBUG] Cleaned ID:', workOrderId);
  const wo = await WorkOrder.findById(workOrderId)
    .populate('vendorId', 'name')
    .populate('issuedBy', 'name')
    .populate('tenderId', 'title')
    .populate('completionReport')
    .lean();
  console.log('[DEBUG] WorkOrder found:', !!wo);
  if (!wo) throw new Error('WORK_ORDER_NOT_FOUND');
  const totalMilestones = wo.milestones.length;
  const completed = wo.milestones.filter((m) => m.status === 'completed').length;
  const progress = totalMilestones === 0 ? 100 : Math.round((completed / totalMilestones) * 100);
  console.log('sd', wo.vendorId.name);
  const vendorName = wo.vendorId?.name;
  return {
    workOrder: {
      _id: wo._id,
      woNumber: wo.woNumber,
      tenderId: { title: wo.tenderId?.title },
      vendorId: wo.vendorId,
      vendorName,
      publisher: wo.issuedBy?.name || 'Publisher',
      contractAmount: wo.value,
      issuedAt: wo.createdAt,
      completedAt: wo.completionDate,
      startDate: wo.startDate,
      endDate: wo.completionDate,
      description: wo.description,
      deliverables: [],
      milestones: wo.milestones,
      progress,
      completionReport: wo.completionReport,
      completionApprovedByPublisher: wo.milestones.every((m) => m.status === 'completed'),
    },
  };
};
exports.saveCompletionReport = async (workOrderId, pdfBuffer) => {
  const wo = await WorkOrder.findById(workOrderId);
  if (!wo) throw new Error('WORK_ORDER_NOT_FOUND');
  const filename = `Completion-Report-${wo.woNumber}.pdf`;
  const cld = await uploadToCloudinary(pdfBuffer, 'nexabid/completion_reports', filename, 'auto');
  const fileDoc = await File.create({
    ownerId: wo.issuedBy,
    fileName: filename,
    fileUrl: cld.secure_url,
    mimeType: 'application/pdf',
    size: cld.bytes,
    metadata: {
      public_id: cld.public_id,
      resource_type: cld.resource_type,
      type: cld.type,
      version: cld.version,
    },
  });
  wo.completionReport = fileDoc._id;
  await wo.save({ validateBeforeSave: false });
  return fileDoc.fileUrl;
};
exports.getCreatePOPageData = async (tenderId, userId) => {
  const tender = await Tender.findById(tenderId);
  if (!tender) {
    const error = new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);
    error.statusCode = statusCode.NOT_FOUND;
    throw error;
  }
  if (tender.createdBy.toString() !== userId.toString()) {
    const error = new Error(ERROR_MESSAGES.ACCESS_DENIED);
    error.statusCode = statusCode.FORBIDDEN;
    throw error;
  }
  const oldPO = await PO.findOne({
    tenderId,
    status: 'vendor_rejected',
  });
  if (oldPO) {
    if (oldPO.status === 'vendor_accepted') {
      const error = new Error(ERROR_MESSAGES.PO_ALREADY_ACCEPTED);
      error.statusCode = statusCode.CONFLICT;
      throw error;
    }
    if (oldPO.status !== 'vendor_rejected') {
      const error = new Error(ERROR_MESSAGES.PO_ALREADY_EXISTS);
      error.statusCode = statusCode.CONFLICT;
      throw error;
    }
  }
  const winnerBid = await TenderBid.findOne({
    tenderId,
    isWinner: true,
  }).populate('vendorId');
  if (!winnerBid) {
    const error = new Error(ERROR_MESSAGES.WINNER_VENDOR_NOT_FOUND);
    error.statusCode = statusCode.NOT_FOUND;
    throw error;
  }
  const vendor = winnerBid.vendorId;
  const { amount } = winnerBid.quotes;
  return {
    tender,
    vendor,
    amount,
  };
};
