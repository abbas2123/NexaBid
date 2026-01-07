const Property = require('../../models/property');
const notificationService = require('../notificationService');

exports.getAllProperties = async (page, filter) => {
  const limit = 5;
  const query = {
    deletedAt: null,
    verificationStatus: {
      $exists: true,
      $in: ['submitted', 'approved', 'rejected'],
    },
  };

  if (filter.search && filter.search.trim() !== '') {
    query.$or = [
      { title: new RegExp(filter.search, 'i') },
      { address: new RegExp(filter.search, 'i') },
    ];
  }

  if (filter.status && filter.status.trim() !== '') {
    query.verificationStatus = filter.status;
  }

  const total = await Property.countDocuments(query);

  const property = await Property.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sellerId', 'name email phone')
    .lean();

  return {
    property,
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
