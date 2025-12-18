const express = require("express");
const router = express.Router();
const {
  adminProtect,
  preventAdminBack,
} = require("../../middlewares/adminAuth");
const authProperty = require('../../controllers/admin/propertyManagement');

// VIEW ALL PROPERTIES
router.get("/", adminProtect, authProperty.getAllProperties);

// APPROVE
router.patch("/approve/:id", adminProtect, authProperty.approveProperty);

// REJECT
router.patch("/reject/:id",adminProtect , authProperty.rejectProperty);

router.get("/:id", adminProtect, authProperty.getPropertyDetails)
router.get('/view/live/:propertyId',adminProtect,authProperty.adminLiveAuctionPage);
module.exports = router;
