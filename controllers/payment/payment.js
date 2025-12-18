const Property = require('../../models/property');
const Payment = require('../../models/payment');
const Tender = require('../../models/tender');
const Coupon = require('../../models/coupen');
const CouponRedemption = require('../../models/coupenRedemption');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const TenderParticipants = require('../../models/tenderParticipants');
const PropertyParticipant = require('../../models/propertyParticipant');
const { success } = require('zod');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.initiatePayment = async (req, res) => {
  try {
    const { type, id } = req.query;
    const userId = req.user._id;

    console.log('type', type);
    console.log('id', id);

    if (!type || !id) return res.redirect('/dashboard');

    let amount = 0;

    if (type === 'property') {
      const property = await Property.findById(id);
      if (!property) return res.redirect('/properties');
      amount = 5000;
    }

    if (type === 'tender') {
      const tender = await Tender.findById(id);
      if (!tender) return res.redirect('/user/my-participation');
      amount = 5000 + tender.emdAmount;
    }

    const payment = await Payment.create({
      userId,
      contextType: type,
      contextId: id,
      type: 'participation_fee',
      amount,
      gateway: 'razorpay',
      status: 'pending',
    });

    res.redirect(`/payments/escrow/${payment._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status !== 'pending') {
      return res.json({ success: false, message: 'Invalid payment' });
    }

    // amount is in rupees from frontend (currentPayAmount)
    const razorOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    });

    // store final amount & order id on payment
    payment.amount = amount;
    payment.gatewayPaymentId = razorOrder.id;
    await payment.save();

    return res.json({
      success: true,
      amount: razorOrder.amount, // paise
      orderId: razorOrder.id,
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.json({ success: false, message: 'Server error' });
  }
};

exports.loadEscrowPage = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment || payment.status !== 'pending') {
      return res.redirect('/dashboard');
    }

    let product;
    let breakdown = [];

    if (payment.contextType === 'property') {
      product = await Property.findById(payment.contextId);
      breakdown.push({ label: 'Participation Fee', amount: payment.amount });
    } else {
      product = await Tender.findById(payment.contextId);
      breakdown.push(
        { label: 'Participation Fee', amount: 5000 },
        { label: 'EMD', amount: product.emdAmount }
      );
    }
    const now = new Date();
    const coupons = await Coupon.find({
      $or: [
        { applicableTo: 'all' },
        { applicableTo: payment.contextType + 's' }, // properties / tenders
      ],
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
      ],
    }).lean();
    res.render('payments/escrowPayment', {
      layout: 'layouts/user/userLayout',
      productType: payment.contextType,
      product,
      breakdown,
      totalAmount: payment.amount,
      walletBalance: req.user.walletBalance || 0,
      intentId: payment._id,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      payment,
      coupons,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const {
      paymentId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;

    const payment = await Payment.findById(paymentId);
    console.log('payment found:', payment);
    if (!payment) {
      return res.json({
        success: false,
        redirect: '/payments/failure',
      });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      payment.status = 'failed';
      await payment.save();

      return res.json({
        success: false,
        redirect: `/payments/failure/${payment._id}`,
      });
    }

    payment.status = 'success';
    payment.gatewayTransactionId = razorpay_payment_id;
    await payment.save();
    // pseudo-code inside confirm controller
    if (payment.status === 'success' && payment.metadata?.coupon) {
      const { coupon } = payment.metadata;

      await CouponRedemption.create({
        couponId: coupon.id || coupon._id, // store the coupon._id in metadata too if needed
        userId: payment.userId,
        orderReference: payment._id,
        amountSaved: payment.metadata.discount,
      });
    }

    if (payment.contextType === 'property') {
      await PropertyParticipant.create({
        userId: payment.userId,
        propertyId: payment.contextId,
        participationPaymentId: payment._id,
        status: 'active',
      });
      console.log('Property participant created ✅');
    }

    if (payment.contextType === 'tender') {
      await TenderParticipants.create({
        userId: payment.userId,
        tenderId: payment.contextId,
        participationPaymentId: payment._id,
        status: 'active',
      });
      console.log('Tender participant created ✅');
    }

    return res.json({
      success: true,
      redirect: `/payments/success/${payment._id}`,
    });
  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      redirect: '/payments/failure',
    });
  }
};

exports.paymentSuccessPage = async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId);
  if (!payment || payment.status !== 'success') {
    return res.redirect('/dashboard');
  }

  res.render('payments/paymentSuccess', {
    layout: 'layouts/user/userLayout',
    payment,
    user: req.user,
  });
};

exports.paymentFailurePage = async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId);
  if (!payment) return res.redirect('/dashboard');

  res.render('payments/paymentFails', {
    layout: 'layouts/user/userLayout',
    payment,
  });
};

exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode, intentId } = req.body;
    const userId = req.user._id;

    if (!couponCode || !intentId) {
      return res.json({ success: false, message: 'Invalid request' });
    }

    const payment = await Payment.findById(intentId);
    if (!payment || payment.status !== 'pending') {
      return res.json({ success: false, message: 'Invalid payment' });
    }

    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
    }).lean();

    if (!coupon) {
      return res.json({ success: false, message: 'Invalid coupon' });
    }

    const now = new Date();

    if (
      (coupon.startsAt && now < coupon.startsAt) ||
      (coupon.expiresAt && now > coupon.expiresAt)
    ) {
      return res.json({ success: false, message: 'Coupon expired' });
    }

    if (coupon.minPurchaseAmount && payment.amount < coupon.minPurchaseAmount) {
      return res.json({
        success: false,
        message: 'Minimum purchase not met',
      });
    }

    const alreadyUsed = await CouponRedemption.findOne({
      couponId: coupon._id,
      userId,
    });

    if (alreadyUsed) {
      return res.json({
        success: false,
        message: 'Coupon already used',
      });
    }

    let discount = 0;

    if (coupon.type === 'flat') {
      discount = coupon.value;
    }

    if (coupon.type === 'percent') {
      discount = (payment.amount * coupon.value) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    }

    discount = Math.min(discount, payment.amount);

    payment.metadata = {
      coupon: {
        id: coupon._id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      discount,
      originalAmount: payment.amount,
      finalAmount: payment.amount - discount,
    };

    payment.amount -= discount;
    await payment.save();
    console.log('💾 Saved payment amount:', payment.amount);
console.log('creatingg.......');
console.log('coupon doc:', {
  id: coupon._id,
  code: coupon.code,
  type: coupon.type,
});

console.log('created.......')
    return res.json({
      success: true,
      discount,
      newAmount: payment.amount,
    });
  } catch (err) {
    console.error('Apply coupon error:', err);
    return res.json({
      success: false,
      message: 'Server error',
    });
  }
};

exports.removeCoupon = async (req, res) => {
  try {
    const { intentId } = req.body;

    console.log('🗑️ Removing coupon for payment:', intentId);

    // Find the payment - USE Payment MODEL, not PaymentIntent
    const payment = await Payment.findById(intentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check if payment has metadata with coupon info
    if (!payment.metadata || !payment.metadata.coupon) {
      return res.json({
        success: false,
        message: 'No coupon applied to this payment',
      });
    }

    // Get original amount from metadata
    const originalAmount = payment.metadata.originalAmount || payment.amount;
    const removedCoupon = payment.metadata.coupon.code;

    // Reset payment to original amount
    payment.amount = originalAmount;
    payment.metadata = null; // Clear metadata

    await payment.save();

    console.log('✅ Coupon removed:', removedCoupon);
    console.log('💰 Amount reset to:', payment.amount);

    return res.json({
      success: true,
      message: 'Coupon removed successfully',
      amount: payment.amount,
    });
  } catch (error) {
    console.error('❌ Error removing coupon:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove coupon: ' + error.message,
    });
  }
};
