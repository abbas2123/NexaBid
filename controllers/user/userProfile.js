const vendorService = require("../../services/vender/applicationService");
const statusService = require("../../services/profile/profileService");
const { application } = require("express");
const myProfileService = require('../../services/profile/profileService');
const statusCode = require("../../utils/statusCode");
const { success } = require("zod");
const User = require('../../models/user');

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
    res.status(500).send("Server Error");
  }
};

exports.getUserStatuspage = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/auth/login");
    }

    const user = req.user;
    const userId = user._id;

    const { vendorApp, tenderStatus, propertyStatus } =
      await statusService.userStatus(userId);

    const application = await myProfileService.userStatus(userId);

    return res.render("profile/status", {
      layout: "layouts/user/userLayout",
      title: "Account Status",
      user,
      vendorApp, // ✅ now correct
      tenderStatus,
      propertyStatus,
      application: application || null,
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
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    
    const fileInput = req.file || req.files || null;

    const updatedUser = await myProfileService.updateProfile(userId, req.body || {}, fileInput);

    return res.json({
      success: true,
      message: "Profile updated",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Profile update error (controller):", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}