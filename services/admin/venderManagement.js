const User = require("../../models/user");
const vendorApplication = require("../../models/vendorApplication");
const Tender = require("../../models/tender");
const Property = require("../../models/property");

exports.getAllVendorApplication = async () => {
  return await vendorApplication
    .find()
    .populate("userId", "name email phone")
    .sort({ createdAt: -1 });
};
exports.getAllVentdorApplicationById = async (id) => {
  return await vendorApplication.findById(id).populate("userId");
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

exports.approveVendor = async (id, comment) => {
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
  return vendor;
};

exports.rejectVendor = async (id, comment) => {
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
  return vendor;
};

exports.removeVendorService = async (id) => {
  const vendor = await vendorApplication
    .findByIdAndUpdate(
      id,
      {
        status: "rejected",
        adminNote: "Vendor access removed by admin",
        role: "user",
      },
      { new: true },
    )
    .populate("userId");

  if (!vendor) throw new Error("Vendor not found");

  await User.findByIdAndUpdate(vendor.userId._id, { role: "user" });

  return vendor;
};
