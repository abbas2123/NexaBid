console.log("🔥 vendor router LOADED");

const express = require('express');
const router = express.Router();
const vendorApplication = require('../../controllers/vendor/venderApplication.js');
const authMiddleware = require('../../middlewares/authMiddleware')
const vendorUploads = require('../../middlewares/venderUploads.js');


router.get('/apply',authMiddleware.isAuthenticated,authMiddleware.protectRoute,vendorApplication.getVendorApplicationPage)
router.post('/apply',authMiddleware.isAuthenticated,authMiddleware.protectRoute,vendorUploads.array('documents',5),vendorApplication.submitVendorApplication)  



module.exports = router
