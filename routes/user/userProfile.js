
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

router.get('/my-listings',authMiddleware.protectRoute,authController.getMyListingPage);

router.get('/about-us',authMiddleware.protectRoute,authController.getAboutUs);

router.get('/contact',authMiddleware.protectRoute,authController.getContact);
module.exports = router;