const express = require('express');
const authController = require('../../controllers/user/status');
const authMiddleware = require('../../middlewares/authMiddleware');
const router = express.Router();
router.get('/propertyStatus', authMiddleware.protectRoute, authController.propertyStatus);
router.get(
  '/propertyStatus/edit/:id',
  authMiddleware.protectRoute,
  authController.getEditPropertyPage
);
router.post('/property/delete/:id', authMiddleware.protectRoute, authController.deleteProperty);
router.delete(
  '/property/delete-media/:propertyId/:mediaId',
  authMiddleware.protectRoute,
  authController.deleteSingleMedia
);
router.delete(
  '/property/delete-doc/:propertyId/:docId',
  authMiddleware.protectRoute,
  authController.deleteSingleDoc
);
router.get('/tender-status', authMiddleware.protectRoute, authController.getTenderStatusPage);
router.get(
  '/tenders/resubmit/:id',
  authMiddleware.protectRoute,
  authController.getResubmitTenderPage
);
router.delete('/tenders/delete/:id', authMiddleware.protectRoute, authController.deleteTender);
module.exports = router;
