const express = require('express');
const vendorApplication = require('../../controllers/vendor/venderApplication.js');
const authMiddleware = require('../../middlewares/authMiddleware');
const uploadFactory = require('../../middlewares/upload');
const vendorUploads = uploadFactory('nexabid/vendor_docs', undefined, undefined, 'memory');
const validate = require('../../middlewares/validate.js');
const { vendorVerificationSchema } = require('../../validators/vendor.js');

console.log('🔥 vendor router LOADED');


const router = express.Router();

router.get(
  '/apply',
  authMiddleware.isAuthenticated,
  authMiddleware.protectRoute,
  vendorApplication.getVendorApplicationPage
);
router.post(
  '/apply',
  authMiddleware.isAuthenticated,
  authMiddleware.protectRoute,
  vendorUploads.array('documents', 5),
  validate(vendorVerificationSchema),
  vendorApplication.submitVendorApplication
);

module.exports = router;
