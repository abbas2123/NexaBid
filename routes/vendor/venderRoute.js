const express = require('express');
const vendorApplication = require('../../controllers/vendor/venderApplication.js');
const { protectRoute, isAuthenticated, vendorProtect } = require('../../middlewares/authMiddleware');
const uploadFactory = require('../../middlewares/upload');
const vendorUploads = uploadFactory('nexabid/vendor_docs', undefined, undefined, 'memory');
const validate = require('../../middlewares/validate.js');
const { vendorVerificationSchema } = require('../../validators/vendor.js');
const reportManagementController = require('../../controllers/user/reportManagement');
const workOrderController = require('../../controllers/vendor/workOrderController');

console.log('🔥 vendor router LOADED');
const router = express.Router();

router.get(
  '/apply',
  isAuthenticated,
  protectRoute,
  vendorApplication.getVendorApplicationPage
);

router.post(
  '/apply',
  isAuthenticated,
  protectRoute,
  vendorUploads.array('documents', 5),
  validate(vendorVerificationSchema),
  vendorApplication.submitVendorApplication
);

router.get(
  '/reports/work-orders',
  isAuthenticated,
  protectRoute,
  vendorProtect,
  reportManagementController.getWorkOrderReports
);

router.get(
  '/work-order/completed/:id',
  isAuthenticated,
  protectRoute,
  vendorProtect,
  workOrderController.workOrderCompletionPage
);
module.exports = router;
