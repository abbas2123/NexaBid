
const Property = require('../../models/property');
const notificationService = require('../notificationService')




exports.getAllProperties = async () => {
  return await Property.find({deletedAt:null}).sort({createdAt:-1})
    .populate("sellerId", "name email phone")
    .lean();
};

exports.getPropertyDetails = async (id) => {
  return await Property.findById(id)
    .populate('sellerId', 'name email phone')
    .populate('soldTo', 'name email')
    .lean();
};

exports.approvePropertyService = async (id, adminId, message,io) => {
  const property = await Property.findById(id);
  if (!property) return null;

  property.verificationStatus = "approved";
  property.verificationReviewedAt = new Date();
  property.verificationReviewerId = adminId;
  property.rejectionMessage = message || null;
  property.status = "published";

 await property.save();

  await notificationService.sendNotification(
    property.sellerId,
    "Your property application has been approved 🎉",
    "/vendor/dashboard",
   io
  );


  return property
};

exports.rejectPropertyService = async (id, adminId, message,io) => {
  const property = await Property.findById(id);
  if (!property) return null;

  property.verificationStatus = "rejected";
  property.verificationReviewedAt = new Date();
  property.verificationReviewerId = adminId;
  property.rejectionMessage = message || "No comments";
  property.status = "draft";

 await property.save();

await notificationService.sendNotification(
    property.sellerId,
    "Your property application has been rejected ",
    "/vendor/dashboard",
    io
  );
  return property;
};