const express = require('express');
const authController = require('../../controllers/admin/authController');
const { adminProtect, preventAdminBack } = require('../../middlewares/adminAuth');
const { preventAuthPages } = require('../../middlewares/authMiddleware');
const venderManagement = require('../../controllers/admin/vendorManagement');
const reportManagementController = require('../../controllers/admin/reportController');
const router = express.Router();
router.get('/report-management', adminProtect, reportManagementController.getReportDashboard);
router.get('/reports/payment-audit', adminProtect, reportManagementController.getPaymentAuditReport);
router.get(
  '/reports/property-auctions',
  adminProtect,
  reportManagementController.getPropertyAuctionReports
);
router.get('/reports/view/:id', adminProtect, reportManagementController.getAuctionDetailReport);
router.get('/reports/work-orders', adminProtect, reportManagementController.getWorkOrderReports);
router.get('/work-orders/download-report/:id', adminProtect, reportManagementController.downloadWorkOrderReport);
router.get('/reports/tender-evaluation', adminProtect, reportManagementController.getTenderEvaluation);
router.post('/reports/tender-evaluation/export-pdf', adminProtect, reportManagementController.exportTenderEvaluationPDF);
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
