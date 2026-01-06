const express = require('express');
const router = express.Router();
const postAwardController = require('../../controllers/vendor/postAward');
const auth = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/cloudinaryUploader');

router.get(
  '/tender/:id/post-award',
  auth.protectRoute,
  postAwardController.getPublisherPostAwardPage
);
router.get('/tender/:id/po/generate', auth.protectRoute, postAwardController.showCreatePOPage);
router.post(
  '/tender/:id/po/generate',
  auth.protectRoute,
  upload.single('attachment'),
  postAwardController.createPO
);
router.get('/tender/:id/po/view', auth.protectRoute, postAwardController.viewPO);
router.get('/tender/:id/agreement/upload', auth.protectRoute, postAwardController.getUploadPage);
router.post(
  '/tender/:id/agreement/upload',
  auth.protectRoute,
  upload.single('agreement'),
  postAwardController.uploadAgreement
);

router.get('/view/:id', auth.protectRoute, postAwardController.view);

router.post(
  '/agreement/:agreementId/approve',
  auth.protectRoute,
  postAwardController.approveAgreement
);

router.post(
  '/agreement/:agreementId/reject',
  auth.protectRoute,
  postAwardController.rejectAgreement
);

router.get('/tender/:tenderId/workorder/issue', auth.protectRoute, postAwardController.issuePage);

router.post(
  '/tender/:tenderId/workorder',
  auth.protectRoute,
  upload.single('pdfFile'),
  postAwardController.issueWorkOrder
);

router.get('/workorder/file/:fileId', auth.protectRoute, postAwardController.viewWorkOrder);
router.get(
  '/work-orders/:workOrderId/tracking',
  auth.protectRoute,
  postAwardController.trackingPage
);
module.exports = router;
