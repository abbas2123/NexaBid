const vendorApplication = require('../../models/vendorApplication');
const Property = require('../../models/property');
const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const PurchaseOrder = require('../../models/purchaseOrder');
const Agreement = require('../../models/agreement');
const WorkOrder = require('../../models/workOrder');
const PropertyBid = require('../../models/propertyBid');
const File = require('../../models/File');
const PropertyParticipant = require('../../models/propertyParticipant');
const { ERROR_MESSAGES } = require('../../utils/constants');
const TenderParticipants = require('../../models/tenderParticipants');
const { uploadToCloudinary } = require('../../utils/cloudinaryHelper');
const User = require('../../models/user');
exports.getMyProfileData = async (userId) => {
  const user = await User.findById(userId).select('-password').lean();
  if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
  return { user };
};
exports.updateAvatar = async (userId, avatarUrl) => {
  const user = await User.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true });
  if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
  return user;
};
exports.userStatus = async (userId) => {
  const [vendorApp, userProperties, userTenders] = await Promise.all([
    vendorApplication.findOne({ userId }).populate('documents.fileId').populate('ocrResultId'),
    Property.find({ sellerId: userId, deletedAt: null }).sort({ createdAt: -1 }).lean(),
    Tender.find({ createdBy: userId }).sort({ createdAt: -1 }).lean(),
  ]);

  let propertyStatus = 'No Properties Submitted';
  if (userProperties.length > 0) {
    const latest = userProperties[0];
    propertyStatus =
      latest.verificationStatus === 'submitted'
        ? 'Pending Review'
        : latest.verificationStatus === 'approved'
          ? 'Approved'
          : latest.verificationStatus === 'rejected'
            ? 'Rejected'
            : 'Unknown';
  }

  let tenderStatus = 'No Tender Activity';
  let latestTender = null;
  if (userTenders.length > 0) {
    latestTender = userTenders[0];
    switch (latestTender.status) {
      case 'draft':
        tenderStatus = 'Draft (Pending Admin Approval)';
        break;
      case 'submitted':
        tenderStatus = 'Pending Admin Review';
        break;
      case 'published':
        tenderStatus = 'Live (Published)';
        break;
      case 'rejected':
        tenderStatus = 'Rejected by Admin';
        break;
      case 'closed':
        tenderStatus = 'Closed';
        break;
      case 'awarded':
        tenderStatus = 'Awarded';
        break;
      default:
        tenderStatus = 'Unknown Status';
    }
  }
  return {
    vendorApp,
    propertyStatus,
    tenderStatus,
    latestTender,
    userProperties,
    userTenders,
  };
};
exports.getMyParticipationData = async (userId, pPage = 1, tPage = 1, limit = 10) => {
  const pSkip = (pPage - 1) * limit;
  const tSkip = (tPage - 1) * limit;

  const [pTotal, tTotal, participations, tenderParticipations] = await Promise.all([
    PropertyParticipant.countDocuments({ userId }),
    TenderParticipants.countDocuments({ userId }),
    PropertyParticipant.find({ userId })
      .populate('propertyId')
      .sort({ createdAt: -1 })
      .skip(pSkip)
      .limit(limit)
      .lean(),
    TenderParticipants.find({ userId })
      .populate('tenderId')
      .sort({ createdAt: -1 })
      .skip(tSkip)
      .limit(limit)
      .lean(),
  ]);

  const [bids, tenderBids] = await Promise.all([
    PropertyBid.find({ bidderId: userId }).sort({ amount: -1 }).lean(),
    TenderBid.find({ vendorId: userId }).lean(),
  ]);

  const highestBidMap = new Map();
  for (const bid of bids) {
    if (!highestBidMap.has(bid.propertyId.toString())) {
      highestBidMap.set(bid.propertyId.toString(), bid.amount);
    }
  }

  const tenderBidMap = new Map();
  for (const bid of tenderBids) {
    tenderBidMap.set(bid.tenderId.toString(), bid.quotes?.amount || 0);
  }

  const properties = (participations || [])
    .filter((p) => p.propertyId)
    .map((p) => {
      const property = p.propertyId;
      const myBid = highestBidMap.get(property._id.toString()) || 0;
      const now = new Date();
      const auctionEndDate = property.auctionEndsAt ? new Date(property.auctionEndsAt) : null;
      const auctionStartDate = property.auctionStartsAt ? new Date(property.auctionStartsAt) : null;
      const isEnded =
        property.status === 'owned' ||
        property.status === 'closed' ||
        (auctionEndDate && now > auctionEndDate);
      const isLive =
        (property.status === 'active' || property.status === 'published') &&
        auctionStartDate &&
        auctionEndDate &&
        now >= auctionStartDate &&
        now <= auctionEndDate;


      const isWinner = property.soldTo && property.soldTo.toString() === userId.toString();
      return {
        _id: property._id,
        title: property.title,
        type: 'property',
        myBid,
        currentStatus: isEnded ? 'Ended' : isLive ? 'Live' : 'Not Started',
        winStatus: isEnded ? (isWinner ? 'Winner' : 'Lost') : 'Pending',
        statusColor: isEnded
          ? 'bg-gray-200 text-gray-700'
          : isLive
            ? 'bg-blue-100 text-blue-700'
            : 'bg-yellow-100 text-yellow-700',
        winColor: isWinner ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
        projectStatus: isWinner ? 'Assigned' : '—',
        closingDate: property.auctionEndsAt
          ? new Date(property.auctionEndsAt).toLocaleDateString('en-IN')
          : '—',
        isBlocked: property.isBlocked,
        blockingReason: property.blockingReason,
      };
    });

  const tenders = (tenderParticipations || [])
    .filter((t) => t.tenderId)
    .map((t) => {
      const tender = t.tenderId;
      const myOffer = tenderBidMap.get(tender._id.toString()) || 0;
      const now = new Date();
      const bidEndDate = tender.bidEndAt ? new Date(tender.bidEndAt) : null;
      const bidStartDate = tender.bidStartAt ? new Date(tender.bidStartAt) : null;
      const isEnded =
        tender.status === 'closed' ||
        tender.status === 'ended' ||
        tender.status === 'awarded' ||
        (bidEndDate && now > bidEndDate);
      const isLive =
        tender.status === 'active' &&
        bidStartDate &&
        bidEndDate &&
        now >= bidStartDate &&
        now <= bidEndDate;
      const isWinner = tender.awardedTo && tender.awardedTo.toString() === userId.toString();
      return {
        _id: tender._id,
        title: tender.title,
        type: 'tender',
        myOffer,
        currentStatus: isEnded ? 'Ended' : isLive ? 'Live' : 'Not Started',
        winStatus: isEnded ? (isWinner ? 'Winner' : 'Lost') : 'Pending',
        statusColor: isEnded
          ? 'bg-gray-200 text-gray-700'
          : isLive
            ? 'bg-blue-100 text-blue-700'
            : 'bg-yellow-100 text-yellow-700',
        winColor: isWinner ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
        projectStatus: isWinner ? 'Assigned' : '—',
        closingDate: tender.bidEndAt ? new Date(tender.bidEndAt).toLocaleDateString('en-IN') : '—',
        submissionDate: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : '—',
        isBlocked: tender.isBlocked,
        blockingReason: tender.blockingReason,
      };
    });
  return {
    properties,
    tenders,
    paginationP: {
      total: pTotal,
      totalPages: Math.ceil(pTotal / limit),
      currentPage: parseInt(pPage),
      hasNextPage: pPage * limit < pTotal,
      hasPrevPage: pPage > 1,
    },
    paginationT: {
      total: tTotal,
      totalPages: Math.ceil(tTotal / limit),
      currentPage: parseInt(tPage),
      hasNextPage: tPage * limit < tTotal,
      hasPrevPage: tPage > 1,
    },
  };
};
exports.getVendorPostAwardData = async (tenderId, userId) => {
  const tender = await Tender.findById(tenderId);
  if (!tender) {
    throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);
  }
  let bid = await TenderBid.findOne({
    tenderId,
    vendorId: userId,
  });

  if (!bid) {
    const isParticipant = await TenderParticipants.findOne({
      tenderId,
      userId,
      status: 'active',
    });

    if (isParticipant && !['awarded', 'closed', 'completed'].includes(tender.status)) {
      return { redirect: `/vendor/tender/${tenderId}/bid` };
    }
    throw new Error(ERROR_MESSAGES.NOT_PARTICIPATED);
  }


  const hasTechFiles = bid.techForms?.files && bid.techForms.files.length > 0;
  const hasFinFiles = bid.finForms?.files && bid.finForms.files.length > 0;
  const techStatus = bid.techReviewStatus;
  const finStatus = bid.finReviewStatus;
  const isTenderClosed = ['awarded', 'closed', 'completed'].includes(tender.status);

  if (!isTenderClosed) {
    if (!hasTechFiles || (hasTechFiles && techStatus !== 'accepted')) {
      return { redirect: `/vendor/tender/${tenderId}/bid` };
    }
    if (!hasFinFiles || (techStatus === 'accepted' && hasFinFiles && finStatus !== 'accepted')) {
      return { redirect: `/vendor/tender/${tenderId}/financial` };
    }
  }

  if (!bid.isWinner) {
    return {
      loseView: true,
      tender,
      bid,
    };
  }
  const po = await PurchaseOrder.findOne({
    tenderId,
    status: { $ne: 'archived' },
  })
    .sort({ createdAt: -1 })
    .populate('pdfFile');
  const poCount = await PurchaseOrder.countDocuments({
    tenderId,
    status: { $ne: 'archived' },
  });
  const isRegenerated = poCount > 1;
  const agreement = await Agreement.findOne({ tenderId })
    .populate('publisherAgreement')
    .populate('uploadedByVendor');
  const workOrder = await WorkOrder.findOne({ tenderId })
    .populate('pdfFile')
    .populate('vendorId', 'name email')
    .populate('issuedBy', 'name email');
  const redirectToAgreementUpload =
    po &&
    po.status === 'vendor_accepted' &&
    agreement &&
    agreement.publisherAgreement &&
    (!agreement.uploadedByVendor || agreement.approvedByPublisher === false);
  if (agreement && agreement.approvedByPublisher === true && workOrder) {
    return {
      redirectToWorkOrder: true,
      workOrderId: workOrder._id,
    };
  }
  return {
    loseView: false,
    redirectToAgreementUpload,
    tender,
    bid,
    po,
    agreement,
    workOrder,
    isRegenerated,
  };
};
exports.respondToPO = async ({ poId, action, reason }) => {
  const po = await PurchaseOrder.findById(poId).populate('tenderId');
  if (!po) {
    throw new Error(ERROR_MESSAGES.PO_NOT_FOUND);
  }
  const tenderId = po.tenderId._id;
  if (action === 'accept') {
    po.status = 'vendor_accepted';
    await po.save();
    return {
      tenderId,
      response: 'accept',
    };
  }
  if (action === 'reject') {
    po.status = 'vendor_rejected';
    po.rejectionReason = reason || '';
    await po.save();
    return {
      tenderId,
      response: 'reject',
    };
  }
  throw new Error(ERROR_MESSAGES.INVALID_ACTION);
};
exports.getAgreementUploadData = async (tenderId, userId) => {
  const po = await PurchaseOrder.findOne({
    tenderId,
    status: { $ne: 'archived' },
  }).sort({ createdAt: -1 });
  if (!po) throw new Error(ERROR_MESSAGES.PO_NOT_CREATED);
  if (po.vendorId.toString() !== userId.toString()) throw new Error(ERROR_MESSAGES.NOT_WINNER);
  if (po.status !== 'vendor_accepted') throw new Error(ERROR_MESSAGES.PO_NOT_ACCEPTED);
  const agreement = await Agreement.findOne({ tenderId })
    .populate('publisherAgreement')
    .populate('uploadedByVendor');
  if (!agreement || !agreement.publisherAgreement)
    throw new Error(ERROR_MESSAGES.PUBLISHER_AGREEMENT_NOT_FOUND);
  return {
    publisherAgreement: agreement.publisherAgreement,
    approved: agreement.approvedByPublisher,
    remarks: agreement.publisherRemarks,
    vendorAgreement: agreement.uploadedByVendor,
  };
};
exports.uploadVendorAgreement = async ({ tenderId, vendorId, file }) => {
  if (!file?.buffer) throw new Error(ERROR_MESSAGES.NO_FILE);
  const activePO = await PurchaseOrder.findOne({
    tenderId,
    status: { $ne: 'archived' },
  }).sort({ createdAt: -1 });
  if (!activePO) throw new Error(ERROR_MESSAGES.PO_NOT_CREATED);
  if (activePO.vendorId.toString() !== vendorId.toString())
    throw new Error(ERROR_MESSAGES.NOT_WINNER);
  if (activePO.status !== 'vendor_accepted') throw new Error(ERROR_MESSAGES.PO_NOT_ACCEPTED);
  let agreement = await Agreement.findOne({ tenderId });
  if (!agreement || !agreement.publisherAgreement)
    throw new Error(ERROR_MESSAGES.PUBLISHER_AGREEMENT_NOT_FOUND);
  if (agreement.uploadedByVendor && agreement.approvedByPublisher !== false)
    throw new Error(ERROR_MESSAGES.AGREEMENT_ALREADY_SIGNED);
  const cld = await uploadToCloudinary(
    file.buffer,
    'post_award/vendor_agreements',
    file.originalname,
    'auto'
  );
  const fileDoc = await File.create({
    ownerId: vendorId,
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
  agreement.uploadedByVendor = fileDoc._id;
  agreement.approvedByPublisher = null;
  agreement.publisherRemarks = null;
  await agreement.save();
  return true;
};
exports.getWorkOrderDetailsService = async (workOrderId) => {
  return WorkOrder.findById(workOrderId)
    .populate('vendorId', 'name email')
    .populate('issuedBy', 'name email')
    .populate('tenderId', 'title')
    .populate('milestones')
    .populate('vendorProofs')
    .populate('attachments')
    .populate('pdfFile')
    .populate('notes.author', 'name email');
};
exports.uploadProofService = async (woId, milestoneId, file, _userId) => {
  const wo = await WorkOrder.findById(woId);
  if (!wo) throw new Error(ERROR_MESSAGES.WORK_ORDER_NOT_FOUND);
  const m = wo.milestones.id(milestoneId);
  if (!m) throw new Error(ERROR_MESSAGES.MILESTONE_NOT_FOUND);
  const cld = await uploadToCloudinary(
    file.buffer,
    'work_orders/proofs',
    file.originalname,
    'auto'
  );
  wo.vendorProofs.push({
    milestoneId: m._id,
    filename: file.originalname,
    fileUrl: cld.secure_url,
    mimetype: file.mimetype,
    size: file.size,
    status: 'pending',
  });
  await wo.save();
};
exports.completeMilestoneService = async (woId, milestoneId) => {
  const wo = await WorkOrder.findById(woId);
  const m = wo.milestones.id(milestoneId);
  m.status = 'completed';
  m.approvedAt = new Date();
  await wo.save();
};
exports.completeWorkOrderService = async (woId) => {
  const wo = await WorkOrder.findById(woId);
  if (!wo.milestones.every((m) => m.status === 'completed'))
    throw new Error(ERROR_MESSAGES.COMPLETE_ALL_MILESTONES_FIRST);
  wo.status = 'completed';
  await wo.save();
};
exports.startMilestoneService = async (woId, mid, userId) => {
  const workOrder = await WorkOrder.findById(woId);
  if (!workOrder) {
    throw { status: 404, message: ERROR_MESSAGES.WORK_ORDER_NOT_FOUND };
  }
  if (
    workOrder.vendorId.toString() !== userId.toString() &&
    workOrder.issuedBy.toString() !== userId.toString()
  ) {
    throw { status: 403, message: ERROR_MESSAGES.NOT_AUTHORIZED_UPDATE_MILESTONE };
  }
  const milestone = workOrder.milestones.id(mid);
  if (!milestone) {
    throw { status: 404, message: ERROR_MESSAGES.MILESTONE_NOT_FOUND };
  }
  if (!['scheduled', 'pending'].includes(milestone.status)) {
    throw { status: 400, message: ERROR_MESSAGES.MILESTONE_CANNOT_START };
  }
  milestone.status = 'in_progress';
  milestone.startedAt = new Date();
  await workOrder.save();
  return {
    _id: milestone._id,
    description: milestone.description,
    status: milestone.status,
    startedAt: milestone.startedAt,
  };
};
