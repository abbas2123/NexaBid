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

// Verify Razorpay payment
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

router.get(
  '/processing/:paymentId',
  authMiddleware.protectRoute,
  paymentController.paymentProcessingPage
);

module.exports = router;
