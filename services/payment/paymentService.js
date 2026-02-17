const Razorpay = require('razorpay');
const axios = require('axios');
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
const Notification = require('../../models/notification');
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
    await PropertyParticipant.findOneAndUpdate(
      { propertyId: payment.contextId, userId, status: 'active' },
      {
        userId,
        propertyId: payment.contextId,
        participationPaymentId: payment._id,
        status: BID_STATUS.ACTIVE,
      },
      { upsert: true, new: true }
    );
  } else if (payment.contextType === CONTEXT_TYPES.TENDER) {
    await TenderParticipants.findOneAndUpdate(
      { tenderId: payment.contextId, userId, status: 'active' },
      {
        userId,
        tenderId: payment.contextId,
        participationPaymentId: payment._id,
        status: BID_STATUS.ACTIVE,
      },
      { upsert: true, new: true }
    );
  }
};
exports.startInitiatePayment = async (userId, type, id) => {
  let payment = await Payment.findOne({
    userId,
    contextType: type,
    contextId: id,
    status: { $in: ['pending', 'failed', 'refunded'] },
  });
  let currentAmount = 0;
  if (type === CONTEXT_TYPES.PROPERTY) {
    const property = await Property.findById(id);
    if (!property) throw new Error(ERROR_MESSAGES.PROPERTY_NOT_FOUND);
    if (property.isBlocked) throw new Error('This property is blocked and cannot be paid for.');
    currentAmount = 5000;
  } else if (type === CONTEXT_TYPES.TENDER) {
    const tender = await Tender.findById(id);
    if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);
    if (tender.isBlocked) throw new Error('This tender is blocked and cannot be paid for.');
    currentAmount = 5000 + (tender.emdAmount || 0);
  } else {
    throw new Error(ERROR_MESSAGES.INVALID_CONTEXT_TYPE);
  }
  if (payment) {
    let checkSave = false;
    if (payment.amount !== currentAmount) {
      payment.amount = currentAmount;
      payment.gatewayPaymentId = null;
      if (payment.metadata && payment.metadata.payableAmount) {
        payment.metadata = {};
      }
      checkSave = true;
    }
    if (payment.status === 'failed' || payment.status === 'refunded') {
      payment.status = PAYMENT_STATUS.PENDING;
      payment.gatewayPaymentId = null;
      payment.gatewayTransactionId = null;
      payment.refundStatus = 'pending';
      payment.refundAmount = 0;


      if (payment.metadata) {
        delete payment.metadata.failureReason;
        delete payment.metadata.refundNote;
      }

      checkSave = true;
    }
    if (checkSave) {
      await payment.save();
    }
    return payment;
  }
  return await Payment.create({
    userId,
    contextType: type,
    contextId: id,
    type: PAYMENT_TYPES.PARTICIPATION_FEE,
    amount: currentAmount,
    gateway: GATEWAYS.RAZORPAY,
    status: PAYMENT_STATUS.PENDING,
  });
};
exports.createRazorpayOrder = async (paymentId) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.FAILED] },
  });
  if (!payment) {
    throw new Error(ERROR_MESSAGES.INVALID_PAYMENT);
  }
  if (payment.status === PAYMENT_STATUS.FAILED) {
    payment.status = PAYMENT_STATUS.PENDING;
    await payment.save();
  }


  const product = payment.contextType === CONTEXT_TYPES.PROPERTY
    ? await Property.findById(payment.contextId)
    : await Tender.findById(payment.contextId);

  if (product?.isBlocked) {
    throw new Error('This item has been blocked by administration. Payment cannot proceed.');
  }
  if (payment.gatewayPaymentId) {
    try {
      const payments = await razorpay.orders.fetchPayments(payment.gatewayPaymentId);
      const successfulPayment = payments.items.find((p) => p.status === 'captured');
      if (successfulPayment) {
        payment.status = PAYMENT_STATUS.SUCCESS;
        payment.gatewayTransactionId = successfulPayment.id;
        payment.amount = payment.metadata?.payableAmount || payment.amount;
        await payment.save();
        await _handlePostPaymentActions(payment, payment.userId);
        throw new Error(ERROR_MESSAGES.PAYMENT_ALREADY_COMPLETED);
      }
    } catch (err) {
      console.error(err);
    }
    const payable = payment.metadata?.payableAmount || payment.amount;
    return {
      orderId: payment.gatewayPaymentId,
      amount: Math.round(payable * 100),
    };
  }
  const payable = payment.metadata?.payableAmount || payment.amount;


  if (payable <= 0) {
    payment.status = PAYMENT_STATUS.SUCCESS;
    payment.gateway = GATEWAYS.WALLET;
    payment.gatewayTransactionId = `FREE_${Date.now()}`;
    payment.amount = 0;
    await payment.save();

    await _handlePostPaymentActions(payment, payment.userId);

    return {
      orderId: payment.gatewayTransactionId,
      amount: 0,
      bypassed: true,
      paymentId: payment._id
    };
  }

  const { withTimeout } = require('../../utils/promiseUtils');
  let razorOrder;
  const RAZORPAY_TIMEOUT = 15000;
  const razorpayCall = async () => {
    try {
      const order = await razorpay.orders.create({
        amount: Math.round(payable * 100),
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
      });
      return order;
    } catch (sdkError) {
      const auth = Buffer.from(
        `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
      ).toString('base64');
      const response = await axios.post(
        'https://api.razorpay.com/v1/orders',
        {
          amount: Math.round(payable * 100),
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`,
        },
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    }
  };

  razorOrder = await withTimeout(
    razorpayCall(),
    RAZORPAY_TIMEOUT,
    ERROR_MESSAGES.PAYMENT_GATEWAY_SLOW
  );

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

  const now = new Date();
  const [userWallet, product, coupons] = await Promise.all([
    Wallet.findOne({ userId }).then((w) => w || Wallet.create({ userId, balance: 0 })),
    payment.contextType === CONTEXT_TYPES.PROPERTY
      ? Property.findById(payment.contextId)
      : Tender.findById(payment.contextId),
    Coupon.find({
      isActive: true,
      $or: [{ applicableTo: 'all' }, { applicableTo: `${payment.contextType}s` },],
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
      ],
    }).lean(),
  ]);

  const breakdown = [];
  if (payment.contextType === CONTEXT_TYPES.PROPERTY) {
    breakdown.push({ label: 'Participation Fee', amount: payment.amount });
  } else {
    breakdown.push(
      { label: 'Participation Fee', amount: 5000 },
      { label: 'EMD', amount: product.emdAmount }
    );
  }

  return {
    payment,
    product,
    breakdown,
    walletBalance: userWallet.balance || 0,
    coupons,
  };
};
exports.processWalletPayment = async (userId, paymentId) => {
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: { $in: ['pending', 'failed'] } },
    { $set: { status: 'processing' } },
    { new: true }
  );
  if (!payment) {
    throw new Error(ERROR_MESSAGES.INVALID_PAYMENT);
  }

  const product = payment.contextType === CONTEXT_TYPES.PROPERTY
    ? await Property.findById(payment.contextId)
    : await Tender.findById(payment.contextId);

  if (product?.isBlocked) {
    payment.status = PAYMENT_STATUS.PENDING;
    await payment.save();
    throw new Error('This item has been blocked by administration. Payment cannot proceed.');
  }
  let userWallet = await Wallet.findOne({ userId });
  if (!userWallet) {
    userWallet = await Wallet.create({ userId, balance: 0 });
  }
  const payable = payment.metadata?.payableAmount || payment.amount;
  if (userWallet.balance < payable) {
    throw new Error(
      `${ERROR_MESSAGES.INSUFFICIENT_BALANCE_PREFIX}${userWallet.balance}, Required: ₹${payable}`
    );
  }
  userWallet.balance -= payable;
  userWallet.updatedAt = new Date();
  await userWallet.save();
  await WalletTransaction.create({
    walletId: userWallet._id,
    userId,
    type: 'debit',
    source: 'payment',
    amount: payable,
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
  payment.amount = payable;
  await payment.save();
  await _handlePostPaymentActions(payment, userId);
  return {
    paymentId: payment._id,
    newBalance: userWallet.balance,
  };
};
exports.verifyRazorpayPayment = async (paymentId, razorpayData) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = razorpayData;
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    throw new Error(ERROR_MESSAGES.MISSING_RAZORPAY_DATA);
  }
  const payment = await Payment.findOne({
    _id: paymentId,
    status: PAYMENT_STATUS.PENDING,
  });
  if (!payment) throw new Error(ERROR_MESSAGES.PAYMENT_NOT_FOUND);

  const stringToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(stringToSign)
    .digest('hex');
  if (generatedSignature !== razorpay_signature) {
    payment.status = PAYMENT_STATUS.FAILED;
    payment.gatewayPaymentId = null;
    payment.metadata = { ...payment.metadata, failureReason: ERROR_MESSAGES.SIGNATURE_MISMATCH };
    await payment.save();
    throw new Error(ERROR_MESSAGES.SIGNATURE_FAILED);
  }
  payment.status = PAYMENT_STATUS.SUCCESS;
  payment.gatewayTransactionId = razorpay_payment_id;
  payment.amount = payment.metadata?.payableAmount || payment.amount;
  await payment.save();






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
    errorReason: payment.metadata?.failureReason || 'Verification failed. Please check your bank status or contact support.',
  };
};

exports.applyCoupon = async (userId, intentId, couponCode) => {
  const payment = await Payment.findById(intentId);
  if (!payment || payment.status !== PAYMENT_STATUS.PENDING)
    throw new Error(ERROR_MESSAGES.INVALID_PAYMENT);
  if (payment.metadata?.coupon) throw new Error(ERROR_MESSAGES.REMOVE_COUPON_FIRST);
  const coupon = await Coupon.findOne({
    code: couponCode.toUpperCase(),
    isActive: true,
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
    originalAmount: payment.amount,
    payableAmount: finalAmount,
  };
  payment.gatewayPaymentId = null;
  await payment.save();
  return { discount, newAmount: finalAmount };
};
exports.removeCoupon = async (intentId) => {
  const payment = await Payment.findById(intentId);
  if (!payment) throw new Error(ERROR_MESSAGES.PAYMENT_NOT_FOUND);
  if (payment.status !== PAYMENT_STATUS.PENDING)
    throw new Error(ERROR_MESSAGES.CANNOT_MODIFY_COMPLETED);
  if (!payment.metadata?.coupon) throw new Error(ERROR_MESSAGES.NO_COUPON_APPLIED);
  const originalAmount = payment.amount;
  const removedCouponCode = payment.metadata.coupon.code;
  payment.metadata = {};
  payment.gatewayPaymentId = null;
  await payment.save();
  return { amount: originalAmount, removedCouponCode };
};
exports.markPaymentFailed = async (paymentId, reason) => {
  const payment = await Payment.findById(paymentId);
  if (!payment || payment.status !== PAYMENT_STATUS.PENDING) return;
  payment.status = PAYMENT_STATUS.FAILED;
  payment.gatewayPaymentId = null;
  payment.metadata = {
    ...payment.metadata,
    failureReason: reason || ERROR_MESSAGES.USER_CANCELLED_OR_DECLINED,
  };
  await payment.save();
};

exports.processAutomaticRefunds = async (contextId, contextType, reason) => {
  const successfulPayments = await Payment.find({
    contextId,
    contextType,
    status: PAYMENT_STATUS.SUCCESS,
  });

  console.log(`Found ${successfulPayments.length} successful payments to refund for ${contextType} ${contextId}`);

  if (!successfulPayments.length) {
    return;
  }

  await Promise.all(
    successfulPayments.map((payment) => _processSingleRefund(payment, contextId, contextType, reason))
  );
};

const _processSingleRefund = async (payment, contextId, contextType, reason) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();

  let userWallet = await Wallet.findOne({ userId: payment.userId }).session(session);
  if (!userWallet) {
    userWallet = new Wallet({ userId: payment.userId, balance: 0 });
  }

  const refundAmount = payment.amount;
  userWallet.balance += refundAmount;
  userWallet.updatedAt = new Date();
  await userWallet.save({ session });

  await WalletTransaction.create(
    [
      {
        walletId: userWallet._id,
        userId: payment.userId,
        type: 'credit',
        source: 'refund',
        amount: refundAmount,
        balanceAfter: userWallet.balance,
        metadata: {
          paymentId: payment._id,
          contextType,
          contextId,
          reason: `Auto-refund (Item Blocked): ${reason}`,
        },
      },
    ],
    { session }
  );


  await Payment.updateOne(
    { _id: payment._id },
    {
      $set: {
        status: 'refunded',
        gatewayPaymentId: null,
        gatewayTransactionId: null,
        refundAmount,
        refundStatus: 'completed',
        'metadata.refundNote': `System auto-refund (Item Blocked): ${reason}`,
      },
    },
    { session }
  );


  let contextTitle = 'Item';
  if (contextType === CONTEXT_TYPES.PROPERTY) {
    const property = await Property.findById(contextId).select('title').session(session);
    if (property) contextTitle = property.title;

    await PropertyParticipant.updateOne(
      { propertyId: contextId, userId: payment.userId },
      { $set: { status: 'cancelled' } },
      { session }
    );
    await PropertyBid.updateMany(
      { propertyId: contextId, bidderId: payment.userId },
      { $set: { bidStatus: 'cancelled' } },
      { session }
    );
  } else if (contextType === CONTEXT_TYPES.TENDER) {
    const tender = await Tender.findById(contextId).select('title').session(session);
    if (tender) contextTitle = tender.title;

    await TenderParticipants.updateOne(
      { tenderId: contextId, userId: payment.userId },
      { $set: { status: 'cancelled' } },
      { session }
    );
  }


  await Notification.create(
    [
      {
        userId: payment.userId,
        message: `Your fee of ₹${refundAmount} for ${contextType} #${contextTitle} has been refunded. Reason: ${reason}`,
        link: contextType === 'property' ? `/properties/${contextId}` : `/tenders/${contextId}`,
      },
    ],
    { session }
  );

  await session.commitTransaction();
  session.endSession();
};
