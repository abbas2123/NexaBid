const User = require('../../models/user');
const vendorApplication = require('../../models/vendorApplication');
const notificationService = require('../notificationService');
const { ERROR_MESSAGES } = require('../../utils/constants');
exports.getAllVendorApplications = async (page, filter) => {
  const limit = 10;
  const query = {};
  if (filter.status && filter.status.trim() !== '') {
    query.status = filter.status.trim();
  }
  if (filter.search && filter.search.trim() !== '') {
    const users = await User.find({
      $or: [
        { name: new RegExp(filter.search.trim(), 'i') },
        { email: new RegExp(filter.search.trim(), 'i') },
      ],
    }).select('_id');
    const userIds = users.map((u) => u._id);
    query.$or = [
      { businessName: new RegExp(filter.search.trim(), 'i') },
      { panNumber: new RegExp(filter.search.trim(), 'i') },
      { gstNumber: new RegExp(filter.search.trim(), 'i') },
      { userId: { $in: userIds } },
    ];
  }
  const total = await vendorApplication.countDocuments(query);
  const applications = await vendorApplication
    .find(query)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('userId', 'name email phone')
    .lean();
  return {
    applications,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasPrevPage: page > 1,
      hasNextPage: page * limit < total,
    },
  };
};
exports.getAllVentdorApplicationById = async (id) =>
  await vendorApplication
    .findById(id)
    .populate('userId')
    .populate({
      path: 'documents.fileId',
      select: 'fileName fileUrl mimeType uploadedAt',
    })
    .lean();
exports.startReview = async (id) => {
  const vendor = await vendorApplication.findById(id);
  if (!vendor) throw new Error(ERROR_MESSAGES.VENDOR_NOT_FOUND);
  if (vendor.status === 'submitted') {
    vendor.status = 'pending';
    await vendor.save();
  }
  return vendor;
};
exports.approveVendor = async (id, comment, req) => {
  const vendor = await vendorApplication
    .findByIdAndUpdate(id, { status: 'approved', adminNote: comment }, { new: true })
    .populate('userId');
  await User.findByIdAndUpdate(vendor.userId._id, {
    role: 'vendor',
    isVendor: true,
  });
  await notificationService.sendNotification(
    vendor.userId._id,
    'Your vendor application has been approved 🎉',
    '/vendor/dashboard',
    req.app.get('io')
  );
  return vendor;
};
exports.rejectVendor = async (id, comment, req) => {
  const vendor = await vendorApplication
    .findByIdAndUpdate(id, { status: 'rejected', adminNote: comment }, { new: true })
    .populate('userId');
  await User.findByIdAndUpdate(vendor.userId._id, {
    role: 'user',
    isVendor: false,
  });
  await notificationService.sendNotification(
    vendor.userId._id,
    'Your vendor application has been rejected ',
    '/vendor/dashboard',
    req.app.get('io')
  );
  return vendor;
};
exports.removeVendorService = async (id, req) => {
  const vendor = await vendorApplication
    .findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        adminNote: 'Vendor access removed by admin',
        role: 'user',
        isVendor: false,
      },
      { new: true, runValidators: true }
    )
    .populate('userId');
  if (!vendor) throw new Error(ERROR_MESSAGES.VENDOR_NOT_FOUND);
  await User.findByIdAndUpdate(vendor.userId._id, { role: 'user', isVendor: false });
  await notificationService.sendNotification(
    vendor.userId._id,
    'Vendor access removed by admin',
    '/vendor/dashboard',
    req.app.get('io')
  );
  return vendor;
};
