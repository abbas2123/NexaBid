const vendorService = require("../../services/vender/applicationService");
const myProfileService = require('../../services/profile/profileService');
const statusCode = require("../../utils/statusCode");
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
  propertyStatus,
  tenderStatus,
  latestTender,
  userProperties,
  userTenders
} = await myProfileService.userStatus(userId);

    return res.render("profile/status", {
      layout: "layouts/user/userLayout",
      title: "Account Status",
      user,
      vendorApp,
      tenderStatus,
      propertyStatus,
       tenders: userTenders,    // ADD THIS
  latestTender,   
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

