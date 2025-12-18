const Property = require('../../models/property');
const Payment = require('../../models/payment');
const Tender = require('../../models/tender');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const TenderParticipants = require('../../models/tenderParticipants');
const PropertyParticipant = require('../../models/propertyParticipant');
const tenderParticipants = require('../../models/tenderParticipants');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* =========================
   INITIATE PAYMENT
========================= */
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

    const razorOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    });

    const payment = await Payment.create({
      userId,
      contextType: type, // 'property' or 'tender'
      contextId: id, // propertyId or tenderId
      type: 'participation_fee',
      amount,
      gateway: 'razorpay',
      gatewayPaymentId: razorOrder.id,
      status: 'pending',
    });

    res.redirect(`/payments/escrow/${payment._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

/* =========================
   ESCROW PAGE
========================= */
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
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

/* =========================
   VERIFY PAYMENT
========================= */
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

    // ✅ SUCCESS
    payment.status = 'success';
    payment.gatewayTransactionId = razorpay_payment_id;
    await payment.save();

    // ✅ AFTER SUCCESS: create participant entry
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

/* =========================
   PROCESSING PAGE
========================= */
exports.paymentProcessingPage = async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId);
  if (!payment) return res.redirect('/dashboard');

  if (payment.status === 'success') {
    return res.redirect(`/payments/success/${payment._id}`);
  }
  if (payment.status === 'failed') {
    return res.redirect(`/payments/failure/${payment._id}`);
  }

  res.render('payments/paymentProseccing', {
    layout: 'layouts/user/userLayout',
    payment,
  });
};

/* =========================
   SUCCESS PAGE
========================= */
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

/* =========================
   FAILURE PAGE
========================= */
exports.paymentFailurePage = async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId);
  if (!payment) return res.redirect('/dashboard');

  res.render('payments/paymentFails', {
    layout: 'layouts/user/userLayout',
    payment,
  });
};
