const paymentService = require('../../services/payment/paymentService');
const statusCode = require('../../utils/statusCode');
const {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VIEWS,
  LAYOUTS,
  REDIRECTS,
  ROUTES,
} = require('../../utils/constants');
exports.initiatePayment = async (req, res) => {
  try {
    const { type, id } = req.query;
    const userId = req.user._id;
    console.log('type', type);
    console.log('id', id);
    if (!type || !id) return res.redirect(REDIRECTS.DASHBOARD);
    const payment = await paymentService.startInitiatePayment(userId, type, id);
    res.redirect(`${ROUTES.PAYMENT_ESCROW}/${payment._id}`);
  } catch (err) {
    console.error(err);
    if (err.message === ERROR_MESSAGES.PROPERTY_NOT_FOUND)
      return res.redirect(REDIRECTS.PROPERTIES);
    if (err.message === ERROR_MESSAGES.TENDER_NOT_FOUND)
      return res.redirect(REDIRECTS.MY_PARTICIPATION);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
exports.createOrder = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;
    const result = await paymentService.createRazorpayOrder(paymentId, amount);
    console.log('payment order creating......');
    return res.status(statusCode.OK).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
exports.loadEscrowPage = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user._id;
    const data = await paymentService.getEscrowPageDetails(paymentId, userId);
    res.status(statusCode.OK).render(VIEWS.ESCROW_PAYMENT, {
      layout: LAYOUTS.USER_LAYOUT,
      productType: data.payment.contextType,
      product: data.product,
      breakdown: data.breakdown,
      totalAmount: data.payment.amount,
      walletBalance: data.walletBalance,
      intentId: data.payment._id,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      payment: data.payment,
      coupons: data.coupons,
      user: req.user,
    });
  } catch (err) {
    console.error('Load escrow error:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
exports.processWalletPayment = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;
    const userId = req.user._id;
    console.log('💳 Wallet payment:', { paymentId, amount, userId });
    const result = await paymentService.processWalletPayment(userId, paymentId, amount);
    console.log('✅ Wallet payment successful');
    return res.status(statusCode.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.PAYMENT_SUCCESSFUL,
      redirect: `${ROUTES.PAYMENT_SUCCESS}/${result.paymentId}`,
      newBalance: result.newBalance,
    });
  } catch (err) {
    console.error('❌ Wallet payment error:', err);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.PAYMENT_FAILED + err.message,
    });
  }
};
exports.verifyPayment = async (req, res) => {
  try {
    console.log('🚀 Verify Payment Route Hit');
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));

    const paymentId = req.query.paymentId || req.body.paymentId;
    console.log('🆔 Payment ID extracted:', paymentId);

    const payment = await paymentService.verifyRazorpayPayment(paymentId, req.body);
    console.log('✅ Payment verified successfully:', payment._id);

    console.log('🔄 Redirecting to success page...');
    return res.redirect(`/payments/success/${payment._id}`);
  } catch (err) {
    console.error('❌ Verify Payment Error:', err);
    console.error('❌ Error Stack:', err.stack);

    const paymentId = req.query.paymentId || req.body.paymentId;
    const reason = encodeURIComponent(err.message || 'Verification Failed');

    if (paymentId) {
      console.log(`🔄 Redirecting to failure page (Payment ID: ${paymentId})`);
      return res.redirect(`/payments/failure/${paymentId}?reason=${reason}`);
    } else {
      console.log('❌ No Payment ID found to redirect to failure page');
      return res.status(400).send('Payment Verification Failed and Payment ID missing.');
    }
  }
};
exports.paymentSuccessPage = async (req, res) => {
  try {
    console.log('sdddvd');
    const payment = await paymentService.getSuccessPageData(req.params.paymentId);
    if (!payment) {
      return res.redirect(REDIRECTS.DASHBOARD);
    }
    console.log('succ', payment);
    res.status(statusCode.OK).render(VIEWS.PAYMENT_SUCCESS, {
      layout: LAYOUTS.USER_LAYOUT,
      ...payment,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.redirect(REDIRECTS.DASHBOARD);
  }
};
exports.paymentFailurePage = async (req, res) => {
  try {
    console.log('❌ Payment failure route hit');
    const payment = await paymentService.getFailurePageData(req.params.paymentId);
    if (!payment) return res.redirect(REDIRECTS.DASHBOARD);
    console.log('failed', payment);
    res.status(statusCode.OK).render(VIEWS.PAYMENT_FAILS, {
      layout: LAYOUTS.USER_LAYOUT,
      ...payment,
      errorReason: req.query.reason || payment.errorReason,
    });
  } catch (err) {
    console.error(err);
    res.redirect(REDIRECTS.DASHBOARD);
  }
};
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode, intentId } = req.body;
    const userId = req.user._id;
    if (!couponCode || !intentId) {
      return res
        .status(statusCode.BAD_REQUEST)
        .json({ success: false, message: ERROR_MESSAGES.INVALID_REQUEST });
    }
    const result = await paymentService.applyCoupon(userId, intentId, couponCode);
    console.log('✅ Coupon applied:', couponCode);
    return res.status(statusCode.OK).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Apply coupon error:', err);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
exports.removeCoupon = async (req, res) => {
  try {
    const { intentId } = req.body;
    console.log('🗑️ Removing coupon for payment:', intentId);
    const result = await paymentService.removeCoupon(intentId);
    console.log('✅ Coupon removed:', result.removedCouponCode);
    return res.status(statusCode.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.COUPON_REMOVED,
      amount: result.amount,
    });
  } catch (err) {
    console.error('❌ Error removing coupon:', err);
    const status =
      err.message === ERROR_MESSAGES.PAYMENT_NOT_FOUND
        ? statusCode.NOT_FOUND
        : statusCode.INTERNAL_SERVER_ERROR;
    return res.status(status).json({
      success: false,
      message: ERROR_MESSAGES.COUPON_REMOVE_FAILED + err.message,
    });
  }
};
exports.markFailed = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    await paymentService.markPaymentFailed(paymentId, reason);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};
