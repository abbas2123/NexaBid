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
const TenderParticipants = require('../../models/tenderParticipants');

exports.userStatus = async (userId) => {
  const vendorApp = await vendorApplication
    .findOne({ userId })
    .populate('documents.fileId')
    .populate('ocrResultId');

  const query = { sellerId: userId, deletedAt: null };
  const userProperties = await Property.find(query)
    .sort({ createdAt: -1 })
    .lean();

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

  const tenderQuery = { createdBy: userId }; // CHANGE IF USING different field
  const userTenders = await Tender.find(tenderQuery)
    .sort({ createdAt: -1 })
    .lean();

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
  const participations = await PropertyParticipant.find({ userId })
    .populate('propertyId')
    .lean();

  if (!participations.length) {
    return { properties: [], tenders: [] };
  }

  const bids = await PropertyBid.find({ bidderId: userId })
    .sort({ amount: -1 })
    .lean();

  const highestBidMap = new Map();
  for (const bid of bids) {
    if (!highestBidMap.has(bid.propertyId.toString())) {
      highestBidMap.set(bid.propertyId.toString(), bid.amount);
    }
  }

  // 3️⃣ Build properties response
  const properties = participations
    .filter((p) => p.propertyId)
    .map((p) => {
      const property = p.propertyId;
      const myBid = highestBidMap.get(property._id.toString()) || 0;

      const now = new Date();
      const auctionEndDate = property.auctionEndsAt
        ? new Date(property.auctionEndsAt)
        : null;
      const auctionStartDate = property.auctionStartsAt
        ? new Date(property.auctionStartsAt)
        : null;

      // Fix: Define isEnded and isLive for PROPERTIES, not tenders
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

      const isWinner =
        property.soldTo && property.soldTo.toString() === userId.toString();

      return {
        _id: property._id,
        title: property.title,
        type: 'property', // Add type for clarity
        myBid,
        currentStatus: isEnded ? 'Ended' : isLive ? 'Live' : 'Not Started',
        winStatus: isEnded ? (isWinner ? 'Winner' : 'Lost') : 'Pending',
        statusColor: isEnded
          ? 'bg-gray-200 text-gray-700'
          : isLive
            ? 'bg-blue-100 text-blue-700'
            : 'bg-yellow-100 text-yellow-700',
        winColor: isWinner
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700',
        projectStatus: isWinner ? 'Assigned' : '—',
        closingDate: property.auctionEndsAt
          ? new Date(property.auctionEndsAt).toLocaleDateString('en-IN')
          : '—',
      };
    });

  // 4️⃣ Build tenders response
  const tenderParticipations = await TenderParticipants.find({ userId })
    .populate('tenderId')
    .lean();

  const tenders = tenderParticipations
    .filter((t) => t.tenderId)
    .map((t) => {
      const tender = t.tenderId;
      const now = new Date();

      const bidEndDate = tender.bidEndAt ? new Date(tender.bidEndAt) : null;
      const bidStartDate = tender.bidStartAt
        ? new Date(tender.bidStartAt)
        : null;

     
      const isEnded =
        tender.status === 'closed' ||
        tender.status === 'ended' ||
        tender.status==="awarded" ||
        (bidEndDate && now > bidEndDate);

      const isLive =
        tender.status === 'active' &&
        bidStartDate &&
        bidEndDate &&
        now >= bidStartDate &&
        now <= bidEndDate;

      const isWinner =
        tender.awardedTo && tender.awardedTo.toString() === userId.toString();
console.log('iswiner',isWinner)
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
        winColor: isWinner
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700',
        projectStatus: isWinner ? 'Assigned' : '—',
        closingDate: tender.bidEndAt
          ? new Date(tender.bidEndAt).toLocaleDateString('en-IN')
          : '—',
      };
    });

  return { properties, tenders };
};


exports.getVendorPostAwardData = async (tenderId, userId) => {
  console.log('dvdvdv', userId);
  const tender = await Tender.findById(tenderId);
  if (!tender) {
    throw new Error('TENDER_NOT_FOUND');
  }

  const bid = await TenderBid.findOne({
    tenderId,
    vendorId: userId,
  });
  if (!bid) {
    throw new Error('NOT_PARTICIPATED');
  }

  if (!bid.isWinner) {
    return {
      loseView: true,
      tender,
      bid,
    };
  }

  const po = await PurchaseOrder.findOne({ tenderId })
    .sort({ createdAt: -1 })
    .populate('pdfFile');

  console.log('rvevec', po);
  const poCount = await PurchaseOrder.countDocuments({ tenderId });
  const isRegenerated = poCount > 1;

  const agreement = await Agreement.findOne({ tenderId })
    .populate('publisherAgreement')
    .populate('uploadedByVendor');

  const workOrder = await WorkOrder.findOne({ tenderId }).populate('pdfFile');

  const redirectToAgreementUpload =
    po &&
    po.status === 'vendor_accepted' &&
    agreement &&
    agreement.publisherAgreement &&
    !agreement.uploadedByVendor;

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
    throw new Error('PO_NOT_FOUND');
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

  throw new Error('INVALID_ACTION');
};

exports.getAgreementUploadData = async (tenderId, userId) => {
  const po = await PurchaseOrder.findOne({ tenderId }).sort({ createdAt: -1 });

  console.log('veenfw', userId);

  if (!po) throw new Error('PO_NOT_CREATED');

  if (po.vendorId.toString() !== userId.toString())
    throw new Error('NOT_WINNER');

  if (po.status !== 'vendor_accepted') throw new Error('PO_NOT_ACCEPTED');

  const agreement = await Agreement.findOne({ tenderId }).populate(
    'publisherAgreement'
  );

  if (!agreement || !agreement.publisherAgreement)
    throw new Error('PUBLISHER_AGREEMENT_NOT_FOUND');

  return {
    publisherAgreement: agreement.publisherAgreement,
  };
};

exports.uploadVendorAgreement = async ({ tenderId, vendorId, file }) => {
  if (!file) {
    throw new Error('NO_FILE');
  }

  const fileData = await File.create({
    fileName: file.filename,
    originalName: file.originalname,
    fileUrl: `/uploads/agreement/${file.filename}`,
    uploadedBy: vendorId,
  });

  let agreement = await Agreement.findOne({ tenderId });

  if (!agreement) {
    agreement = await Agreement.create({
      tenderId,
      vendorId,
      uploadedByVendor: fileData._id,
    });
  } else {
    agreement.uploadedByVendor = fileData._id;
    await agreement.save();
  }

  return true;
};
