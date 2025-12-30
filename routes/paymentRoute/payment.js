const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/payment/payment');
const authMiddleware = require('../../middlewares/authMiddleware');

router.get(
  '/initiate',
  authMiddleware.protectRoute,
  paymentController.initiatePayment
);

router.get(
  '/escrow/:paymentId',
  authMiddleware.protectRoute,
  paymentController.loadEscrowPage
);
router.post('/create-order',authMiddleware.protectRoute,paymentController.createOrder);
router.post(
  '/confirm',
  authMiddleware.protectRoute,
  paymentController.verifyPayment
);

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
router.post('/apply-coupon',authMiddleware.protectRoute,paymentController.applyCoupon);

router.post('/remove-coupon',authMiddleware.protectRoute,paymentController.removeCoupon );
router.post(
  '/wallet-pay',
  authMiddleware.protectRoute,
  paymentController.processWalletPayment
);

module.exports = router;
