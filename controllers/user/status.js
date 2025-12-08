
const propertyService = require('../../services/property/propertyService');
 const Property = require('../../models/property');
const Tender = require('../../models/tender');
const tenderService = require('../../services/tender/tender');
const File = require("../../models/File");
const path = require("path");
const fs = require("fs");


exports.propertyStatus = async(req,res)=>{
  try {
     if (!req.user) {
      return res.redirect("/auth/login");
    }

    const user = req.user;
    
    const properties = await Property.find({ sellerId: user._id,deletedAt: null })
      .sort({ createdAt: -1 })
      .lean();

    return res.render('profile/propertyStatus',{
      layout:'layouts/user/userLayout',
      properties,
      user
    })
  } catch (error) {
    console.log("Property status error", err);
    res.render("/views/error.ejs",{layout:'layouts/user/userLayout'});
  }
}

exports.getEditPropertyPage = async (req, res) => {
  try {
    const propertyId = req.params.id;

    const { property, media, docs } =
      await propertyService.getPropertyForEdit(propertyId);

    return res.render("user/createProperty", {
      layout: "layouts/user/userLayout",
      title: "Edit Property",
      property,
      media,
      docs,
      user: req.user,
      googleMapsApiKey: process.env.MAPS_API_KEY,
    });

  } catch (err) {
    console.error("Edit property page error:", err);

    return res.status(err.statusCode || 500).render("error", {
      layout: "layouts/user/userLayout",
      message: err.message || "Something went wrong",
    });
  }
};


exports.getSinglePropertyForOwner = async (req, res) => {
  try {
    const userId = req.user._id;
    const propertyId = req.params.id;

    const property = await propertyService.getSinglePropertyOwnedByUser(propertyId, userId);

    return res.render("user/propertyDetailsPage", {
      layout: "layouts/user/userLayout",
      property,
      user: req.user,
    });

  } catch (err) {
    console.error("Get single user property error:", err);

    return res.status(err.statusCode || 500).render("error", {
      layout: "layouts/user/userLayout",
      message: err.message || "Something went wrong",
    });
  }
};

exports.deleteProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const userId = req.user._id;

    await propertyService.deleteUserProperty(propertyId, userId);

    return res.redirect("/user/status/propertyStatus");

  } catch (err) {
    console.error("❌ Delete Property Error:", err);

    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

exports.deleteSingleDoc = async (req, res) => {
  try {
    const { propertyId, docId } = req.params;
    const userId = req.user._id;

    const deletedDoc = await propertyService.deleteUserPropertyDoc(propertyId, docId, userId);

    return res.json({
      success: true,
      message: "Document removed successfully",
      docId,
    });

  } catch (err) {
    console.error("Delete doc error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

exports.deleteSingleMedia = async (req, res) => {
  try {
    const { propertyId, mediaId } = req.params;
    const userId = req.user._id;

    await propertyService.deleteUserPropertyImage(propertyId, mediaId, userId);

    return res.json({
      success: true,
      message: "Image removed successfully",
      mediaId,
    });

  } catch (err) {
    console.error("Delete media error:", err);

    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

exports.getTenderStatusPage = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/auth/login");

    const tenders = await Tender.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

        

    return res.render("profile/tenderStatus", {
      layout: "layouts/user/userLayout",
      tenders,
      user: req.user,
      title: "My Tender Status",
    });

  } catch (error) {
    console.log("Tender Status Error", error);
    return res.render("error", {
      layout: "layouts/user/userLayout",
      message: "Unable to load tender status"
    });
  }
};

exports.getResubmitTenderPage = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const { tender, files } =
      await tenderService.getTenderForResubmit(tenderId);

    return res.render("vendor/tenderCreate", {
      layout: "layouts/user/userLayout",
      title: "Re-Submit Tender",
      tender,
      files,
      user: req.user,
    });

  } catch (err) {
    console.error("Resubmit tender page error:", err);

    return res.status(err.statusCode || 500).render("error", {
      layout: "layouts/user/userLayout",
      message: err.message || "Something went wrong",
    });
  }
};

exports.deleteTender = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const tender = await Tender.findOne({
      _id: tenderId,
      createdBy: req.user._id
    });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: "Tender not found or unauthorized"
      });
    }

    // delete documents
    const fileIds = tender.files.map(f => f.fileId);

    if (fileIds.length > 0) {
      const files = await File.find({ _id: { $in: fileIds } });
      files.forEach(f => {
        try {
          const filePath = path.join(process.cwd(), 'uploads', 'tender-docs', f.fileName);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch { }
      });

      await File.deleteMany({ _id: { $in: fileIds } });
    }

    await Tender.deleteOne({ _id: tenderId });

    return res.json({
      success: true,
      message: "Tender deleted successfully"
    });

  } catch (error) {
    console.log("Tender deletion error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error deleting tender"
    });
  }
};