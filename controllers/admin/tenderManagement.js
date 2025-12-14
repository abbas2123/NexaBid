// controllers/admin/tenderManagement.js
const Tender = require("../../models/tender");
const File = require("../../models/File");
const notificationService= require('../../services/notificationService');
exports.getAdminTenderPage = async (req, res) => {
  try {
    const tenders = await Tender.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.render("admin/tenderManagement", {
      layout: "layouts/admin/adminLayout",
      tenders,
      currentPage: "tenders",
    });
  } catch (err) {
    console.error("Admin Tender Management error:", err);
    return res.status(500).render("error", {
      layout: "layouts/admin/adminLayout",
      message: "Failed to load tenders",
    });
  }
};

exports.getTenderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const tender = await Tender.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: "Tender not found",
      });
    }

    const files = await File.find({
      relatedType: "tender",
      relatedId: id,
    }).lean();

    return res.json({
      success: true,
      tender: {
        ...tender,
        files: files.map((f) => ({
          fileId: f._id,
          originalName: f.fileName,
          url: f.fileUrl,
          size: f.size,
        })),
      },
    });
  } catch (error) {
    console.error("Tender fetch error", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching tender",
    });
  }
};

exports.updateTenderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    console.log(" UpdateTenderStatus ->", { id, status, comment });

    const allowedStatuses = ["draft", "submitted", "published", "rejected", "closed"];

    if (!allowedStatuses.includes(status)) {
      console.log(" Invalid status:", status);
      return res.status(400).json({
        success: false,
        message: `Invalid status value: ${status}`,
      });
    }

    const tender = await Tender.findById(id);

    if (!tender) {
      console.log(" Tender not found for id:", id);
      return res.status(404).json({
        success: false,
        message: "Tender not found",
      });
    }

    tender.status = status;
   if (comment && comment.trim() !== "") {
      tender.adminComment = comment.trim();  // VERY IMPORTANT!
    }

    await tender.save();

    console.log("Tender status updated:", tender._id, tender.status);
const io = req.app.get("io");

if (status === "published") {
  await notificationService.sendNotification(
    tender.createdBy,  // CORRECT USER
    "Your tender has been approved & published 🎉",
    `/tenders/${tender._id}`,
    io
  );
}

// REJECTED EVENT
if (status === "rejected") {
  await notificationService.sendNotification(
    tender.createdBy,
    "Your tender has been rejected ❌",
    `/tenders/${tender._id}`,
    io
  );
}

// CLOSED EVENT
if (status === "closed") {
  await notificationService.sendNotification(
    tender.createdBy,
    "Your tender has been closed 🚫",
    `/tenders/${tender._id}`,
    io
  );
}
    return res.json({
      success: true,
      message: `Tender status updated to ${status}`,
    });
  } catch (error) {
    console.error("Tender status update error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error updating status",
    });
  }
};