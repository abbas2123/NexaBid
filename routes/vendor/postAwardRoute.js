const express = require('express');
const router = express.Router();
const postAwardController = require('../../controllers/vendor/postAward');
const auth = require('../../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const uploads = require('../../middlewares/agreementupload');
const upload = multer({
    dest: path.join(__dirname,'../../uploads/poAttachments')
});


router.get(
  "/tender/:id/post-award",
  auth.protectRoute,
  postAwardController.getPublisherPostAwardPage
);
router.get('/tender/:id/po/generate',auth.protectRoute,postAwardController.showCreatePOPage);
router.post('/tender/:id/po/generate',auth.protectRoute,upload.single('attachment'),postAwardController.createPO);
router.get(
  "/tender/:id/po/view",
  auth.protectRoute,
  postAwardController.viewPO
);
router.get('/tender/:id/agreement/upload',auth.protectRoute,postAwardController.getUploadPage);
router.post('/tender/:id/agreement/upload',auth.protectRoute,uploads.single('agreement'),postAwardController.uploadAgreement);


router.get("/view/:id",auth.protectRoute,postAwardController.view);

router.post(
  "/agreement/:agreementId/approve",
  auth.protectRoute,
  postAwardController.approveAgreement
);

router.post(
  "/agreement/:agreementId/reject",
  auth.protectRoute,
  postAwardController.rejectAgreement
);

router.get(
  "/tender/:tenderId/workorder/issue",
  auth.protectRoute,
  postAwardController.issuePage
);


router.post(
  "/tender/:tenderId/workorder",
  auth.protectRoute,
  uploads.single("workOrderFile"),
  postAwardController.issueWorkOrder
);


router.get(
  "/file/:id",
 auth.protectRoute,
  postAwardController.view
);

module.exports = router;