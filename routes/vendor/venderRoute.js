console.log("🔥 vendor router LOADED");

const express = require("express");
const router = express.Router();
const vendorApplication = require("../../controllers/vendor/venderApplication.js");
const authMiddleware = require("../../middlewares/authMiddleware");
const vendorUploads = require("../../middlewares/venderUploads.js");
const validate = require('../../middlewares/validate.js');
const {vendorVerificationSchema} = require('../../validators/vendor.js');
router.get(
  "/apply",
  authMiddleware.isAuthenticated,
  authMiddleware.protectRoute,
  vendorApplication.getVendorApplicationPage,
);
router.post(
  "/apply",
  authMiddleware.isAuthenticated,
  authMiddleware.protectRoute,
  vendorUploads.array("documents", 5),
  //  validate(vendorVerificationSchema),
  vendorApplication.submitVendorApplication,
);

module.exports = router;
