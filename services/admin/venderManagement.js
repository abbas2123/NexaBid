const User = require("../../models/user");
const vendorApplication = require("../../models/vendorApplication");
const notificationService = require('../notificationService');

exports.getAllVendorApplication = async () => {
  return await vendorApplication
    .find()
    .populate("userId", "name email phone")
    .sort({ createdAt: -1 });
};
exports.getAllVentdorApplicationById = async (id) => {
  return await vendorApplication
    .findById(id)
    .populate("userId")
    .populate({
      path: "documents.fileId",  // IMPORTANT
      select: "fileName filePath type uploadedAt" // You need these in frontend
    })
    .lean();
};

exports.startReview = async (id) => {
  const vendor = await vendorApplication.findById(id);

  if (!vendor) throw new Error("Vendor not found");

  if (vendor.status === "submitted") {
    vendor.status = "pending";
    await vendor.save();
  }
  return vendor;
};

exports.approveVendor = async (id, comment,req) => {
  const vendor = await vendorApplication
    .findByIdAndUpdate(
      id,
      { status: "approved", adminNote: comment },
      { new: true },
    )
    .populate("userId");
  await User.findByIdAndUpdate(vendor.userId._id, {
    role: "vendor",
    isVendor: true,
  });


await notificationService.sendNotification(
  vendor.userId._id,
  "Your vendor application has been approved 🎉",
  "/vendor/dashboard",
  req.app.get("io")
);
  return vendor;
};

exports.rejectVendor = async (id, comment,req) => {
  const vendor = await vendorApplication
    .findByIdAndUpdate(
      id,
      { status: "rejected", adminNote: comment },
      { new: true },
    )
    .populate("userId");
  await User.findByIdAndUpdate(vendor.userId._id, {
    role: "user",
    isVendor: false,
  });

  await notificationService.sendNotification(
  vendor.userId._id,
  "Your vendor application has been rejected ",
  "/vendor/dashboard",
  req.app.get("io")
);

  return vendor;
};

exports.removeVendorService = async (id,req) => {
  const vendor = await vendorApplication
    .findByIdAndUpdate(
      id,
      {
        status: "rejected",
        adminNote: "Vendor access removed by admin",
        role: "user",
        isVendor: false,
      },
      { new: true ,runValidators: true},
    )
    .populate("userId");

  if (!vendor) throw new Error("Vendor not found");

  await User.findByIdAndUpdate(vendor.userId._id, { role: "user" ,isVendor:false});

  await notificationService.sendNotification(
  vendor.userId._id,
  "Vendor access removed by admin",
  "/vendor/dashboard",
  req.app.get("io")
);

  return vendor;

  
};
