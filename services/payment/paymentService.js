const Razorpay = require('razorpay');
const crypto = require('crypto');
const Property = require('../../models/property');
const Payment = require('../../models/payment');
const Tender = require('../../models/tender');
const Coupon = require('../../models/coupen');
const CouponRedemption = require('../../models/coupenRedemption');
const TenderParticipants = require('../../models/tenderParticipants');
const PropertyParticipant = require('../../models/propertyParticipant');
const PropertyBid = require('../../models/propertyBid');
const Wallet = require('../../models/wallet');
const WalletTransaction = require('../../models/walletTransaction');
const {
  PAYMENT_STATUS,
  CONTEXT_TYPES,
  PAYMENT_TYPES,
  GATEWAYS,
  COUPON_TYPES,
  BID_STATUS,
  ERROR_MESSAGES,
} = require('../../utils/constants');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const _handlePostPaymentActions = async (payment, userId) => {
  if (payment.contextType === CONTEXT_TYPES.PROPERTY) {
    const property = await Property.findById(payment.contextId);
    await PropertyBid.findOneAndUpdate(
      { propertyId: payment.contextId, bidderId: userId },
      {
        propertyId: payment.contextId,
        bidderId: userId,
        amount: property.basePrice || 0,
        escrowPaymentId: payment._id,
        bidStatus: BID_STATUS.ACTIVE,
      },
      { upsert: true, new: true }
    );
    console.log('✅ Bid created/updated with escrowPaymentId');
  }

  // 2. Coupon redemption
  if (payment.metadata?.coupon) {
    const alreadyRedeemed = await CouponRedemption.findOne({
      couponId: payment.metadata.coupon.id,
      userId,
      orderReference: payment._id,
    });

    if (!alreadyRedeemed) {
      await CouponRedemption.create({
        couponId: payment.metadata.coupon.id,
        userId,
        orderReference: payment._id,
        amountSaved: payment.metadata.discount,
      });
    }
  }

  if (payment.contextType === CONTEXT_TYPES.PROPERTY) {
    await PropertyParticipant.create({
      userId,
      propertyId: payment.contextId,
      participationPaymentId: payment._id,
      status: BID_STATUS.ACTIVE,
    });
    console.log('✅ Property participant created');
  } else if (payment.contextType === CONTEXT_TYPES.TENDER) {
    await TenderParticipants.create({
      userId,
      tenderId: payment.contextId,
      participationPaymentId: payment._id,
      status: BID_STATUS.ACTIVE,
    });
    console.log('✅ Tender participant created');
  }
};

exports.startInitiatePayment = async (userId, type, id) => {
  const existing = await Payment.findOne({
    userId,
    contextType: type,
    contextId: id,
    status: { $in: ['pending', 'failed'] },
  });

  if (existing) return existing;
  let amount = 0;

  if (type === CONTEXT_TYPES.PROPERTY) {
    const property = await Property.findById(id);
    if (!property) throw new Error(ERROR_MESSAGES.PROPERTY_NOT_FOUND);
    amount = 5000;
  } else if (type === CONTEXT_TYPES.TENDER) {
    const tender = await Tender.findById(id);
    if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);
    amount = 5000 + tender.emdAmount;
  } else {
    throw new Error(ERROR_MESSAGES.INVALID_CONTEXT_TYPE);
  }

  return await Payment.create({
    userId,
    contextType: type,
    contextId: id,
    type: PAYMENT_TYPES.PARTICIPATION_FEE,
    amount,
    gateway: GATEWAYS.RAZORPAY,
    status: PAYMENT_STATUS.PENDING,
  });
};

exports.createRazorpayOrder = async (paymentId, amount) => {
   const payment = await Payment.findOne({
     _id: paymentId,
     status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.FAILED] },
   });

  if (!payment) {
    throw new Error(ERROR_MESSAGES.INVALID_PAYMENT);
  }
  if (payment.gatewayPaymentId) {
    return {
      orderId: payment.gatewayPaymentId,
      amound: payment.amount * 100,
    };
  }
  const razorOrder = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
  });

  payment.amount = amount;
  payment.gatewayPaymentId = razorOrder.id;
  await payment.save();

  return {
    amount: razorOrder.amount,
    orderId: razorOrder.id,
  };
};

exports.getEscrowPageDetails = async (paymentId, userId) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    userId,
  });
  if (!payment) {
    throw new Error(ERROR_MESSAGES.INVALID_PAYMENT);
  }

  // Get or create wallet
  let userWallet = await Wallet.findOne({ userId });
  if (!userWallet) {
    userWallet = await Wallet.create({ userId, balance: 0 });
  }

  let product;
  const breakdown = [];

  if (payment.contextType === CONTEXT_TYPES.PROPERTY) {
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
    $or: [{ applicableTo: 'all' }, { applicableTo: `${payment.contextType}s` }],
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
    ],
  }).lean();

  return {
    payment,
    product,
    breakdown,
    walletBalance: userWallet.balance || 0,
    coupons,
  };
};

exports.processWalletPayment = async (userId, paymentId, amount) => {
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: PAYMENT_STATUS.PENDING },
    { $set: { status: PAYMENT_STATUS.PROCESSING } },
    { new: true }
  );

  if (!payment) {
    throw new Error(ERROR_MESSAGES.INVALID_PAYMENT);
  }

  let userWallet = await Wallet.findOne({ userId });
  if (!userWallet) {
    userWallet = await Wallet.create({ userId, balance: 0 });
  }

  if (userWallet.balance < amount) {
    throw new Error(
      `Insufficient balance. Available: ₹${userWallet.balance}, Required: ₹${amount}`
    );
  }

  userWallet.balance -= amount;
  userWallet.updatedAt = new Date();
  await userWallet.save();

  await WalletTransaction.create({
    walletId: userWallet._id,
    userId,
    type: 'debit',
    source: 'payment',
    amount,
    balanceAfter: userWallet.balance,
    metadata: {
      paymentId: payment._id,
      contextType: payment.contextType,
      contextId: payment.contextId,
      reason: 'Participation fee payment',
    },
  });

  payment.status = PAYMENT_STATUS.SUCCESS;
  payment.gateway = GATEWAYS.WALLET;
  payment.gatewayTransactionId = `WALLET_${Date.now()}`;
  await payment.save();

  await _handlePostPaymentActions(payment, userId);

  return {
    paymentId: payment._id,
    newBalance: userWallet.balance,
  };
};

exports.verifyRazorpayPayment = async (paymentId, razorpayData) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = razorpayData;

  const payment = await Payment.findOne({
    _id: paymentId,
    status: PAYMENT_STATUS.PENDING,
  });
  if (!payment) throw new Error(ERROR_MESSAGES.PAYMENT_NOT_FOUND);

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  console.log('generatedSignature', generatedSignature);

  if (generatedSignature !== razorpay_signature) {
    payment.status = PAYMENT_STATUS.FAILED;
     if (payment.metadata?.originalAmount) {
       payment.amount = payment.metadata.originalAmount;
       payment.metadata = null;
     }
    console.log('payment.status', payment.status);
    await payment.save();
    throw new Error(ERROR_MESSAGES.SIGNATURE_FAILED);
  }

  payment.status = PAYMENT_STATUS.SUCCESS;
  payment.gatewayTransactionId = razorpay_payment_id;
  await payment.save();

  // Execute shared post-payment logic
  await _handlePostPaymentActions(payment, payment.userId);

  return payment;
};

exports.getSuccessPageData = async (paymentId) => {
  const payment = await Payment.findById(paymentId).lean();
  if (!payment || payment.status !== PAYMENT_STATUS.SUCCESS) {
    throw new Error(ERROR_MESSAGES.INVALID_PAYMENT);
  }

  let product = null;
  if (payment.contextType === 'property') {
    product = await Property.findById(payment.contextId).lean();
  } else {
    product = await Tender.findById(payment.contextId).lean();
  }

  const wallet = await Wallet.findOne({ userId: payment.userId }).lean();

  return {
    payment,
    product,
    productType: payment.contextType,
    walletBalance: wallet?.balance || 0,
  };
};

exports.getFailurePageData = async (paymentId) => {
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) throw new Error(ERROR_MESSAGES.PAYMENT_NOT_FOUND);

  let product = null;

  if (payment.contextType === 'property') {
    product = await Property.findById(payment.contextId).lean();
  } else {
    product = await Tender.findById(payment.contextId).lean();
  }

  const wallet = await Wallet.findOne({ userId: payment.userId }).lean();

  return {
    payment,
    product,
    productType: payment.contextType,
    walletBalance: wallet?.balance || 0,
    canRetry: true,
    errorReason: 'Bank declined the transaction',
  };
};
exports.applyCoupon = async (userId, intentId, couponCode) => {
  const payment = await Payment.findById(intentId);
  if (!payment || payment.status !== PAYMENT_STATUS.PENDING)
    throw new Error(ERROR_MESSAGES.INVALID_PAYMENT);
  if (payment.metadata?.coupon) throw new Error(ERROR_MESSAGES.REMOVE_COUPON_FIRST);

  const coupon = await Coupon.findOne({
    code: couponCode.toUpperCase(),
  }).lean();
  if (!coupon) throw new Error(ERROR_MESSAGES.INVALID_COUPON);

  const now = new Date();
  if ((coupon.startsAt && now < coupon.startsAt) || (coupon.expiresAt && now > coupon.expiresAt)) {
    throw new Error(ERROR_MESSAGES.COUPON_EXPIRED);
  }

  if (coupon.minPurchaseAmount && payment.amount < coupon.minPurchaseAmount) {
    throw new Error(ERROR_MESSAGES.MIN_PURCHASE_NOT_MET);
  }

  const alreadyUsed = await CouponRedemption.findOne({
    couponId: coupon._id,
    userId,
  });
  if (alreadyUsed) throw new Error(ERROR_MESSAGES.COUPON_ALREADY_USED);

  const originalAmount = payment.amount;
  let discount = 0;

  if (coupon.type === COUPON_TYPES.FLAT) {
    discount = coupon.value;
  } else if (coupon.type === COUPON_TYPES.PERCENT) {
    discount = (payment.amount * coupon.value) / 100;
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  }

  discount = Math.min(discount, payment.amount);
  const finalAmount = payment.amount - discount;

  payment.metadata = {
    coupon: {
      id: coupon._id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
    },
    discount,
    originalAmount,
    finalAmount,
  };

  payment.amount = finalAmount;
  await payment.save();

  return { discount, newAmount: payment.amount };
};

exports.removeCoupon = async (intentId) => {
  const payment = await Payment.findById(intentId);
  if (!payment) throw new Error(ERROR_MESSAGES.PAYMENT_NOT_FOUND);
  if (payment.status !== PAYMENT_STATUS.PENDING)
    throw new Error(ERROR_MESSAGES.CANNOT_MODIFY_COMPLETED);
  if (!payment.metadata?.coupon) throw new Error(ERROR_MESSAGES.NO_COUPON_APPLIED);

  const { originalAmount } = payment.metadata;
  const removedCouponCode = payment.metadata.coupon.code;

  payment.amount = originalAmount;
  payment.metadata = null;
  await payment.save();

  return { amount: payment.amount, removedCouponCode };
};
