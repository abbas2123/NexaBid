const express = require('express');
const paymentController = require('../../controllers/payment/payment');
const authMiddleware = require('../../middlewares/authMiddleware');
const router = express.Router();
router.get('/initiate', authMiddleware.protectRoute, paymentController.initiatePayment);
router.get('/escrow/:paymentId', authMiddleware.protectRoute, paymentController.loadEscrowPage);
router.post('/create-order', authMiddleware.protectRoute, paymentController.createOrder);
router.all('/confirm', paymentController.verifyPayment);
router.get(
  '/success/:paymentId',
  authMiddleware.protectRoute,
  paymentController.paymentSuccessPage
);
router.get(
  '/failure/:paymentId',
  authMiddleware.protectRoute,
  paymentController.paymentFailurePage
);
router.post('/apply-coupon', authMiddleware.protectRoute, paymentController.applyCoupon);
router.post('/remove-coupon', authMiddleware.protectRoute, paymentController.removeCoupon);
router.post('/wallet-pay', authMiddleware.protectRoute, paymentController.processWalletPayment);
router.post('/mark-failed/:paymentId', paymentController.markFailed);
module.exports = router;
