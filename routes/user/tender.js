const express = require('express');
const authController = require('../../controllers/user/tender');
const authMiddleware = require('../../middlewares/authMiddleware');
const tenderContorller = require('../../controllers/vendor/tenderCreation');
const uploadFactory = require('../../middlewares/upload');
const tenderUpload = uploadFactory('nexabid/tenders');
const router = express.Router();
router.get('/', authMiddleware.protectRoute, authController.getTenderListingPage);
router.get('/create', authMiddleware.protectRoute, tenderContorller.getCreateTenderPage);
router.post(
  '/create',
  authMiddleware.protectRoute,
  tenderUpload.array('docs', 10),
  tenderContorller.createTenderController
);
router.get('/status/:id', authMiddleware.protectRoute, authController.getTenderStatus);
router.get('/:id', authMiddleware.protectRoute, authController.getTenderDetailsPage);
router.patch(
  '/resubmit/:id',
  authMiddleware.protectRoute,
  tenderUpload.array('docs', 10),
  authController.resubmitTender
);
router.get('/doc/:fileId', authMiddleware.protectRoute, authController.viewTenderDoc);
module.exports = router;
