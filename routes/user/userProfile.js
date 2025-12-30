console.log("🔥 userProfile ROUTES LOADED");
const express = require("express");
const router = express.Router();

const authController = require("../../controllers/user/userProfile");
const authMiddleware = require("../../middlewares/authMiddleware");
const TransactionControler = require('../../controllers/user/transaction');
const uploads = require("../../middlewares/agreementupload");

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

router.get(
  "/my-listings",
  authMiddleware.protectRoute,
  authController.getMyListingPage
);

router.get("/about-us", authMiddleware.protectRoute, authController.getAboutUs);

router.get("/contact", authMiddleware.protectRoute, authController.getContact);
router.get(
  "/my-participation",
  authMiddleware.protectRoute,
  authController.getMyParticipation
);
router.get(
  "/my-participation/tender/:id",
  authMiddleware.protectRoute,
  authController.viewTenderPostAward
);
router.post(
  "/vendor/po/:id/respond",
  authMiddleware.protectRoute,
  authController.vendorRespondPO
);

router.get(
  "/:tenderId/upload",
  authMiddleware.protectRoute,
  authController.getUploadPage
);
router.post(
  "/:tenderId/upload",
  authMiddleware.protectRoute,
  uploads.single("signedAgreement"),
  authController.uploadSignedAgreement
);
router.get(
  '/transactions',
  authMiddleware.protectRoute,
  TransactionControler.getTransaction
);
module.exports = router;
