

const Property = require('../../models/property');
const PropertyBid = require('../../models/propertyBid');
const notificationService = require('../notificationService');

exports.getAllProperties = async (page, filter) => {
  const limit = 5;
  const query = {
    deletedAt: null,
  };

  if (filter.status && filter.status.trim() !== '') {
    query.verificationStatus = filter.status;
  } else {
    query.verificationStatus = {
      $exists: true,
      $in: ['submitted', 'approved', 'rejected'],
    };
  }

  if (filter.search && filter.search.trim() !== '') {
    query.$or = [
      { title: new RegExp(filter.search, 'i') },
      { address: new RegExp(filter.search, 'i') },
    ];
  }


  const total = await Property.countDocuments(query);

  const property = await Property.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sellerId', 'name email phone')
    .lean();

  
  const now = new Date();
  const liveAuctions = await Property.find({
    isAuction: true,
    verificationStatus: 'approved',
    auctionStartsAt: { $lte: now },
    auctionEndsAt: { $gte: now },
    deletedAt: null,
  })
    .sort({ auctionEndsAt: 1 })
    .limit(3)
    .lean();

  return {
    property,
    liveAuctions,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasPrevPage: page > 1,
      hasNextPage: page * limit < total,
    },
  };
};

exports.getPropertyDetails = async (id) =>
  await Property.findById(id)
    .populate('sellerId', 'name email phone')
    .populate('soldTo', 'name email')
    .lean();

exports.approvePropertyService = async (id, adminId, message, io) => {
  const property = await Property.findById(id);
  if (!property) return null;

  property.verificationStatus = 'approved';
  property.verificationReviewedAt = new Date();
  property.verificationReviewerId = adminId;
  property.rejectionMessage = message || null;
  property.status = 'published';

  await property.save();

  await notificationService.sendNotification(
    property.sellerId,
    'Your property application has been approved 🎉',
    '/vendor/dashboard',
    io
  );

  return property;
};

exports.rejectPropertyService = async (id, adminId, message, io) => {
  const property = await Property.findById(id);
  if (!property) return null;

  property.verificationStatus = 'rejected';
  property.verificationReviewedAt = new Date();
  property.verificationReviewerId = adminId;
  property.rejectionMessage = message || 'No comments';
  property.status = 'draft';

  await property.save();

  await notificationService.sendNotification(
    property.sellerId,
    'Your property application has been rejected ',
    '/vendor/dashboard',
    io
  );
  return property;
};

exports.getAuctionReportData = async (propertyId) => {
  const property = await Property.findById(propertyId)
    .populate('sellerId', 'name email phone')
    .populate('currentHighestBidder', 'name email phone')
    .lean();

  if (!property) return null;

  const bids = await PropertyBid.find({ propertyId })
    .populate('bidderId', 'name email phone')
    .sort({ amount: -1 })
    .lean();

  const winningBid = bids.length > 0 ? bids[0] : null;

  return {
    property,
    winningBid,
    totalBids: bids.length,
    bids,
  };
};

exports.getAdminLiveAuctionData = async (propertyId) => {
  const property = await Property.findById(propertyId)
    .populate('sellerId', 'name email phone')
    .populate('currentHighestBidder', 'name email phone')
    .lean();

  if (!property) return null;

  const bids = await PropertyBid.find({ propertyId })
    .populate('bidderId', 'name email phone')
    .sort({ createdAt: -1 })
    .lean();

  const now = new Date();
  let auctionStatus = 'upcoming';
  if (now >= property.auctionStartsAt && now <= property.auctionEndsAt) {
    auctionStatus = 'live';
  } else if (now > property.auctionEndsAt) {
    auctionStatus = 'ended';
  }

  return {
    property,
    bids,
    auctionStatus,
    currentHighestBid: property.currentHighestBid || 0,
    highestBidder: property.currentHighestBidder,
    auctionEndsAt: property.auctionEndsAt,
    propertyId: property._id,
  };
};
