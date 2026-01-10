const express = require('express');
const authController = require('../../controllers/admin/authController');
const { adminProtect, preventAdminBack } = require('../../middlewares/adminAuth');
const { preventAuthPages } = require('../../middlewares/authMiddleware');
const venderManagement = require('../../controllers/admin/vendorManagement');
const reportManagementController = require('../../controllers/user/reportManagement');

const router = express.Router();

router.get('/report-management', adminProtect, reportManagementController.getReportManagement);
router.get(
  '/reports/property-auctions',
  adminProtect,
  reportManagementController.getPropertyAuctionReports
);
router.get('/reports/balance', adminProtect, reportManagementController.getBalanceReport);
router.get('/reports/view/:id', adminProtect, reportManagementController.getAuctionDetailReport);

router.get('/login', preventAuthPages, authController.getAdminLogin);
router.post('/login', authController.postAdminLogin);

router.get('/dashboard', adminProtect, preventAdminBack, authController.getAdminDashboard);

router.get('/logout', authController.adminLogout);

router.get('/user-management', adminProtect, authController.getUserManagement);

router.patch('/user/block/:id', adminProtect, authController.blockUser);

router.patch('/user/unblock/:id', adminProtect, authController.unblockUser);

router.get('/vendor-management', adminProtect, venderManagement.getAllVendorApplications);

router.get('/vendor/details/:id', adminProtect, venderManagement.getVendorDetails);
router.patch('/vendor/start-review/:id', adminProtect, venderManagement.startReview);
router.patch('/vendor/approve/:id', adminProtect, venderManagement.approveVendor);

router.patch('/vendor/reject/:id', adminProtect, venderManagement.rejectVendor);
router.patch('/vendor/remove/:id', adminProtect, venderManagement.removeVendor);

module.exports = router;
