const express = require("express");
const router = express.Router();
const  PropertyRequest = require('../../models/fraudFlag')
const authController = require("../../controllers/admin/authController");
const authProperty = require('../../controllers/admin/propertyManagement');
const {
  adminProtect,
  preventAdminBack,
} = require("../../middlewares/adminAuth");
const { preventAuthPages } = require("../../middlewares/authMiddleware");
const venderManagement = require("../../controllers/admin/vendotManagement");

router.get("/login", preventAuthPages, authController.getAdminLogin);
router.post("/login", authController.postAdminLogin);

router.get(
  "/dashboard",
  adminProtect,
  preventAdminBack,
  authController.getAdminDashboard,
);

router.get("/logout", authController.adminLogout);

router.get("/user-management", adminProtect, authController.getUserManagement);

router.patch("/user/block/:id", adminProtect, authController.blockUser);

router.patch("/user/unblock/:id", adminProtect, authController.unblockUser);

router.get(
  "/vendor-management",
  adminProtect,
  venderManagement.getVendorApplication,
);

router.get(
  "/vendor/details/:id",
  adminProtect,
  venderManagement.getVendorDetails,
);
router.patch(
  "/vendor/start-review/:id",
  adminProtect,
  venderManagement.startReview,
);
router.patch(
  "/vendor/approve/:id",
  adminProtect,
  venderManagement.approveVendor,
);

router.patch("/vendor/reject/:id", adminProtect, venderManagement.rejectVendor);
router.patch("/vendor/remove/:id", adminProtect, venderManagement.removeVendor);



module.exports = router;