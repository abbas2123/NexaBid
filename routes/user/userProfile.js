
console.log("🔥 userProfile ROUTES LOADED");
const express = require("express");
const router = express.Router();

const authController = require("../../controllers/user/userProfile");
const authMiddleware = require("../../middlewares/authMiddleware");


router.get("/profile", authMiddleware.protectRoute, authController.userProfile);
router.get(
  "/status",
  authMiddleware.protectRoute,
  authController.getUserStatuspage
);
router.get("/logout", authController.logOut);

router.get(
  "/my-profile",
  authMiddleware.protectRoute,
  authController.getMyProfile
);
module.exports = router;