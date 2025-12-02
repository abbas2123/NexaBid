
console.log("🔥 userProfile ROUTES LOADED");
const express = require("express");
const router = express.Router();

const authController = require("../../controllers/user/userProfile");
const authMiddleware = require("../../middlewares/authMiddleware");

const uploadAvatar = require("../../middlewares/profileUpload");


router.get("/profile", authMiddleware.protectRoute, authController.userProfile);
router.get("/status", authMiddleware.protectRoute, authController.getUserStatuspage);
router.get("/logout", authController.logOut);

router.get("/my-profile", authMiddleware.protectRoute, authController.getMyProfile);

// CHANGE PASSWORD — NO FILES
router.post(
  "/change-password",
  authMiddleware.protectRoute,
  
  authController.changePassword
);

// UPDATE PROFILE — WITH FILES!!!
router.post(
  "/update-profile",
  authMiddleware.protectRoute,
  (req, res, next) => {
    console.log("🔥 BEFORE MULTER");
    next();
  },
  uploadAvatar.any(),     // <--- TEMP: accept any fields
  (req, res, next) => {
    console.log("📄 AFTER MULTER: req.file =", req.file, "req.files =", req.files && req.files.length);
    next();
  },
  authController.updateProfile
);

module.exports = router;