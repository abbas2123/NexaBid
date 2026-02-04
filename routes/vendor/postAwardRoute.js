const express = require('express');
const postAwardController = require('../../controllers/vendor/postAward');
const poController = require('../../controllers/vendor/poController');
const agreementController = require('../../controllers/vendor/agreementController');
const workOrderController = require('../../controllers/vendor/workOrderController');
const auth = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/upload');
const router = express.Router();
router.get(
  '/tender/:id/post-award',
  auth.protectRoute,
  postAwardController.getPublisherPostAwardPage
);
router.get('/tender/:id/po/generate', auth.protectRoute, poController.showCreatePOPage);
router.post(
  '/tender/:id/po/generate',
  auth.protectRoute,
  upload('nexabid/vendor_docs').single('attachment'),
  poController.createPO
);
router.get('/tender/:id/po/view', auth.protectRoute, poController.viewPO);
router.get('/tender/:id/agreement/upload', auth.protectRoute, agreementController.getUploadPage);
router.post(
  '/tender/:id/agreement/upload',
  auth.protectRoute,
  upload('nexabid/agreements', ['pdf'], undefined, 'memory').single('agreement'),
  agreementController.uploadAgreement
);
router.get('/view/:id', auth.protectRoute, agreementController.view);
router.post(
  '/agreement/:agreementId/approve',
  auth.protectRoute,
  agreementController.approveAgreement
);

router.get('/tender/:id/agreement/upload', auth.protectRoute, postAwardController.getUploadPage);
router.post(
  '/tender/:id/agreement/upload',
  auth.protectRoute,
  upload('nexabid/agreements', ['pdf'], undefined, 'memory').single('agreement'),
  postAwardController.uploadAgreement
);


router.get("/view/:id", auth.protectRoute, postAwardController.aview);

router.post(
  '/agreement/:agreementId/reject',
  auth.protectRoute,
  agreementController.rejectAgreement
);
router.get('/tender/:id/workorder/issue', auth.protectRoute, poController.issuePage);
router.post(
  '/tender/:tenderId/workorder',
  auth.protectRoute,
  upload('nexabid/work_orders').single('pdfFile'),
  poController.issueWorkOrder
);
router.get('/workorder/file/:fileId', auth.protectRoute, workOrderController.viewWorkOrder);
router.get(
  '/work-orders/:workOrderId/tracking',
  auth.protectRoute,
  workOrderController.trackingPage
);
router.post('/work-orders/:workOrderId/notes', auth.protectRoute, workOrderController.addNote);
router.post(
  '/work-orders/:id/milestones/:mid/review',
  auth.protectRoute,
  workOrderController.reviewMilestone
);
router.post(
  '/work-orders/:workOrderId/proof/:pid/approve',
  auth.protectRoute,
  workOrderController.approveProof
);
router.post(
  '/work-orders/:workOrderId/proof/:pid/reject',
  auth.protectRoute,
  workOrderController.rejectProof
);
router.post(
  '/work-orders/:workOrderId/complete',
  auth.protectRoute,
  workOrderController.completeWorkOrder
);
router.get(
  '/work-order/completed/:id',
  auth.protectRoute,
  workOrderController.workOrderCompletionPage
);
module.exports = router;
