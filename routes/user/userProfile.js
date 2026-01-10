

const express = require('express');
const profileController = require('../../controllers/user/profile');
const vendorOpController = require('../../controllers/user/vendorOperations');
const authMiddleware = require('../../middlewares/authMiddleware');
const TransactionControler = require('../../controllers/user/transaction');
const uploads = require('../../middlewares/upload');
const reportManagementController = require('../../controllers/user/reportManagement');
const userController = require('../../controllers/vendor/agreementController')
const router = express.Router();


router.get('/profile', authMiddleware.protectRoute, profileController.userProfile);
router.get('/status', authMiddleware.protectRoute, profileController.getUserStatuspage);
router.get('/logout', profileController.logOut);

router.get('/my-profile', authMiddleware.protectRoute, profileController.getMyProfile);

router.get('/my-listings', authMiddleware.protectRoute, vendorOpController.getMyListingPage);

router.get('/about-us', authMiddleware.protectRoute, profileController.getAboutUs);

router.get('/contact', authMiddleware.protectRoute, profileController.getContact);
router.get('/my-participation', authMiddleware.protectRoute, vendorOpController.getMyParticipation);
router.get('/tender-reports', authMiddleware.protectRoute, vendorOpController.getTenderReports);
router.get(
  '/my-participation/tender/:id',
  authMiddleware.protectRoute,
  vendorOpController.viewTenderPostAward
);
router.post(
  '/vendor/po/:id/respond',
  authMiddleware.protectRoute,
  vendorOpController.vendorRespondPO
);

router.get('/:tenderId/upload', authMiddleware.protectRoute, vendorOpController.getUploadPage);
router.post(
  '/:tenderId/upload',
  authMiddleware.protectRoute,
  uploads('nexabid/agreements', ['pdf'], undefined, 'memory').single('agreement'),
  vendorOpController.uploadSignedAgreement
);
router.get('/files/view/:id', authMiddleware.protectRoute, userController.view);
router.get('/transactions', authMiddleware.protectRoute, TransactionControler.getTransaction);
router.get('/report-management', authMiddleware.protectRoute, reportManagementController.getReportManagement);
router.get('/reports/property-auctions', authMiddleware.protectRoute, reportManagementController.getPropertyAuctionReports);
router.get('/reports/balance', authMiddleware.protectRoute, reportManagementController.getBalanceReport);
router.get('/reports/view/:id', authMiddleware.protectRoute, reportManagementController.getAuctionDetailReport);

router.get('/work-orders/:id', authMiddleware.protectRoute, vendorOpController.getWorkOrderDetails);
router.post(
  '/work-orders/:woId/milestones/:mid/start',
  authMiddleware.protectRoute,
  vendorOpController.startMilestone
);
router.post(
  '/work-orders/:woId/milestones/:mid/upload-proof',
  authMiddleware.protectRoute,
  uploads('nexabid/proofs').single('proof'),
  vendorOpController.uploadProof
);
router.post(
  '/work-orders/:woId/milestones/:mid/complete',
  authMiddleware.protectRoute,
  vendorOpController.completeMilestone
);
router.post(
  '/work-orders/:woId/complete',
  authMiddleware.protectRoute,
  vendorOpController.completeWorkOrder
);

module.exports = router;
