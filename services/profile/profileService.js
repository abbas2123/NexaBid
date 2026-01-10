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
const cloudinary = require('../../config/cloudinary');
const User = require('../../models/user');

const upload = (buffer, folder, filename) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ resource_type: 'auto', folder, public_id: filename }, (e, r) => (e ? reject(e) : resolve(r)))
      .end(buffer);
  });

exports.getMyProfileData = async (userId) => {
  const user = await User.findById(userId).select('-password').lean();
  if (!user) throw new Error('User not found');
  return { user };
};

exports.userStatus = async (userId) => {
  const vendorApp = await vendorApplication
    .findOne({ userId })
    .populate('documents.fileId')
    .populate('ocrResultId');

  const query = { sellerId: userId, deletedAt: null };
  const userProperties = await Property.find(query).sort({ createdAt: -1 }).lean();

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

  const tenderQuery = { createdBy: userId };
  const userTenders = await Tender.find(tenderQuery).sort({ createdAt: -1 }).lean();

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

exports.getMyParticipationData = async (userId) => {
  const participations = await PropertyParticipant.find({ userId }).populate('propertyId').lean();

  if (!participations.length) {
    return { properties: [], tenders: [] };
  }

  const bids = await PropertyBid.find({ bidderId: userId }).sort({ amount: -1 }).lean();

  const highestBidMap = new Map();
  for (const bid of bids) {
    if (!highestBidMap.has(bid.propertyId.toString())) {
      highestBidMap.set(bid.propertyId.toString(), bid.amount);
    }
  }


  const properties = participations
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
        property.status === 'active' &&
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
      };
    });


  const tenderParticipations = await TenderParticipants.find({ userId })
    .populate('tenderId')
    .lean();

  const tenders = tenderParticipations
    .filter((t) => t.tenderId)
    .map((t) => {
      const tender = t.tenderId;
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
      console.log('iswiner', isWinner);
      console.log('isended', isEnded);
      return {
        _id: tender._id,
        title: tender.title,
        type: 'tender',
        myOffer: 0,
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
      };
    });

  return { properties, tenders };
};

exports.getVendorPostAwardData = async (tenderId, userId) => {
  console.log('dvdvdv', userId);
  const tender = await Tender.findById(tenderId);
  if (!tender) {
    throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);
  }

  const bid = await TenderBid.findOne({
    tenderId,
    vendorId: userId,
  });
  if (!bid) {
    throw new Error(ERROR_MESSAGES.NOT_PARTICIPATED);
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

  console.log('rvevec', po);
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
  console.log('action', action);
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


  // Sanitize filename: remove extension, replace spaces/special chars
  const nameWithoutExt = file.originalname.replace(/\.[^/.]+$/, '');
  const sanitizedFilename = nameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, '_');

  const cld = await upload(file.buffer, 'post_award/vendor_agreements', sanitizedFilename);

  const fileDoc = await File.create({
    ownerId: vendorId,
    fileName: file.originalname,
    fileUrl: cld.secure_url,
    mimeType: file.mimetype,
    size: file.size,
    metadata: { public_id: cld.public_id },
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
  console.log('woId', woId);
  const wo = await WorkOrder.findById(woId);
  console.log(wo);
  if (!wo) throw new Error('WORK_ORDER_NOT_FOUND');

  const m = wo.milestones.id(milestoneId);
  if (!m) throw new Error('MILESTONE_NOT_FOUND');

  const cld = await upload(file.buffer, 'work_orders/proofs');

  wo.vendorProofs.push({
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
    throw new Error('COMPLETE_ALL_MILESTONES_FIRST');

  wo.status = 'completed';
  await wo.save();
};
exports.startMilestoneService = async (woId, mid, userId) => {
  const workOrder = await WorkOrder.findById(woId);

  if (!workOrder) {
    throw { status: 404, message: 'Work order not found' };
  }


  if (
    workOrder.vendorId.toString() !== userId.toString() &&
    workOrder.issuedBy.toString() !== userId.toString()
  ) {
    throw { status: 403, message: 'Not authorized to update this milestone' };
  }

  const milestone = workOrder.milestones.id(mid);

  if (!milestone) {
    throw { status: 404, message: 'Milestone not found' };
  }

  if (!['scheduled', 'pending'].includes(milestone.status)) {
    throw { status: 400, message: 'Milestone cannot be started from current status' };
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

exports.getVendorTenderReports = async (userId, page = 1, filter = {}) => {
  const limit = 10;

  // 1. Get all tenders user participated in
  const participations = await TenderParticipants.find({ userId })
    .populate('tenderId', 'title status bidEndAt createdAt')
    .lean();

  let allReports = [];

  // 2. Generate virtual reports based on tender status
  for (const p of participations) {
    const tender = p.tenderId;
    if (!tender) continue;

    // Report 1: Bid Summary (Always available if participated)
    allReports.push({
      _id: `bid-${tender._id}`, // Virtual ID
      tenderId: tender,
      reportType: 'bid_summary',
      generatedAt: p.joinedAt || tender.createdAt, // fallback
      status: 'available'
    });

    // Report 2: Evaluation Summary (If evaluation started/done)
    if (['technical_evaluation', 'financial_evaluation', 'awarded', 'closed', 'completed'].includes(tender.status)) {
      allReports.push({
        _id: `eval-${tender._id}`,
        tenderId: tender,
        reportType: 'evaluation',
        generatedAt: tender.bidEndAt || new Date(),
        status: 'available'
      });
    }

    // Report 3: Winner Report (If awarded/completed)
    if (['awarded', 'completed'].includes(tender.status)) {
      allReports.push({
        _id: `winner-${tender._id}`,
        tenderId: tender,
        reportType: 'winner',
        generatedAt: new Date(), // Ideally when awarded
        status: 'available'
      });
    }

    // Report 4: Completion Report (If completed)
    if (tender.status === 'completed') {
      allReports.push({
        _id: `completion-${tender._id}`,
        tenderId: tender,
        reportType: 'completion',
        generatedAt: new Date(),
        status: 'available'
      });
    }
  }

  // 3. Apply Filters (Memory filtering since reports are virtual)
  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    allReports = allReports.filter(r => r.tenderId.title.toLowerCase().includes(searchLower));
  }

  if (filter.reportType) {
    allReports = allReports.filter(r => r.reportType === filter.reportType);
  }

  if (filter.date) {
    const filterDate = new Date(filter.date).toDateString();
    allReports = allReports.filter(r => new Date(r.generatedAt).toDateString() === filterDate);
  }

  // 4. Sort (Newest first)
  allReports.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));

  // 5. Pagination
  const totalReports = allReports.length;
  const totalPages = Math.ceil(totalReports / limit);
  const paginatedReports = allReports.slice((page - 1) * limit, page * limit);

  return {
    reports: paginatedReports,
    pagination: {
      currentPage: Number(page),
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};
