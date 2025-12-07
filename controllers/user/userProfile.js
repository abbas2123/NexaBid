const vendorService = require("../../services/vender/applicationService");
const propertyService = require('../../services/property/propertyService');
const { application } = require("express");
const myProfileService = require('../../services/profile/profileService');
const statusCode = require("../../utils/statusCode");
const { success } = require("zod");
const User = require('../../models/user');
 const Property = require('../../models/property');

 
exports.userProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/auth/login");
    }
    const user = req.user;
    const application = await vendorService.getApplicationStatus(user._id);

    res.render("profile/profile", {
      layout: "layouts/user/userLayout",
      title: "My profile - NexaBid",
      user: user || {},
      application: application || null,
    });
  } catch (error) {
    console.error("Profile load Error:", error);
    res.status(statusCode.INTERNAL_ERROR).send("Server Error");
  }
};


exports.getUserStatuspage = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/auth/login");
    }

    const user = req.user;
    const userId = user._id;

  
    const {
      vendorApp,
      tenderStatus,
      propertyStatus,
      userProperties
    } = await myProfileService.userStatus(userId); 

    return res.render("profile/status", {
      layout: "layouts/user/userLayout",
      title: "Account Status",
      user,
      vendorApp,
      tenderStatus,
      propertyStatus,
      properties: userProperties || [], 
    });

  } catch (error) {
    console.error("Status Page Error:", error);
    return res.redirect("/auth/login");
  }
};


exports.logOut = (req, res) => {
  try {
    res.clearCookie("token");
    return res.redirect("/auth/login");
  } catch (error) {
    console.error("logout error:", error);
    return res.redirect("/");
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    // 1️⃣ Check authentication
    if (!req.user) {
      console.log("❌ No req.user → Redirecting to login");
      return res.redirect("/auth/login");
    }

    // 2️⃣ Fetch fresh user from DB to avoid stale data
    const freshUser = await User.findById(req.user._id);

    if (!freshUser) {
      console.log("❌ User not found in DB");
      return res.redirect("/auth/login");
    }

    // 3️⃣ Render page with ALWAYS valid user object
    return res.render("profile/myProfile.ejs", {
      layout: "layouts/user/userLayout",
      title: "My Profile",
      user: freshUser,
      application: null
    });

  } catch (err) {
    console.error("❌ Profile load error:", err);
    return res.redirect("/auth/dashboard");
  }
};

exports.changePassword = async(req,res) =>{
  try {
    console.log('req.body',req.body)
    const {userId,newPassword,currentPassword,confirmPassword} = req.body;

    if(!newPassword||!currentPassword||!confirmPassword){
      return res.json({
        success:false,
        message:"All field require"
      });
    }

    const response = await myProfileService.changePassword(userId,currentPassword,newPassword,confirmPassword);

    return res.status(statusCode.OK).json({
      success:true,
      message:"Password Change is successfull"
    });
  } catch (err) {
    res.status(statusCode.INTERNAL_ERROR).json({
      success:false,
      message:err.message
    });

  }
}

exports.updateProfile =  async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(statusCode.UNAUTHORIZED).json({ success: false, message: "Unauthorized" });

    
    const fileInput = req.file || req.files || null;

    const updatedUser = await myProfileService.updateProfile(userId, req.body || {}, fileInput);

    return res.json({
      success: true,
      message: "Profile updated",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Profile update error (controller):", err);
    return res.status(statusCode.INTERNAL_ERROR).json({ success: false, message: err.message || "Server error" });
  }
}

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

    return res.redirect("/user/propertyStatus");

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