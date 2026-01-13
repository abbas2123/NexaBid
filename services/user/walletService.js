const Razorpay = require('razorpay');
const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Wallet = require('../../models/wallet');
const WalletTransaction = require('../../models/walletTransaction');
const { ERROR_MESSAGES } = require('../../utils/constants');
const { withTimeout } = require('../../utils/promiseUtils');


const getOrCreateWallet = async (userId, session = null) => {
  let wallet = await Wallet.findOne({ userId }).session(session);
  if (!wallet) {
    if (session) {
      [wallet] = await Wallet.create([{ userId, balance: 0 }], { session });
    } else {
      wallet = await Wallet.create({ userId, balance: 0 });
    }
  }
  return wallet;
};

exports.getWalletPageData = async (userId) => {
  const wallet = await getOrCreateWallet(userId);
  const transactions = await WalletTransaction.find({ userId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(10)
    .lean();
  return {
    wallet,
    transactions,
  };
};

exports.getAllTransactionsData = async (userId, filters) => {
  const wallet = await getOrCreateWallet(userId);
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;
  const transactionType = filters.type;
  const { source } = filters;
  const { fromDate } = filters;
  const { toDate } = filters;

  const query = { userId };
  if (transactionType && ['credit', 'debit'].includes(transactionType)) {
    query.type = transactionType;
  }
  if (source) {
    query.source = source;
  }
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      query.createdAt.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      query.createdAt.$lte = to;
    }
  }

  const transactions = await WalletTransaction.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const totalTransactions = await WalletTransaction.countDocuments(query);
  const totalPages = Math.ceil(totalTransactions / limit);
  const allSources = await WalletTransaction.distinct('source', { userId });

  return {
    wallet,
    transactions,
    currentPage: page,
    totalPages,
    totalTransactions,
    allSources,
  };
};

exports.getWalletBalance = async (userId) => {
  const wallet = await getOrCreateWallet(userId);
  return {
    balance: wallet.balance,
    currency: 'INR',
  };
};

exports.getAddFundsPageData = async (userId) => {
  const wallet = await getOrCreateWallet(userId);
  return {
    walletBalance: wallet.balance,
  };
};



exports.createAddFundsOrder = async (userId, amount) => {
  if (!amount || amount < 100) {
    const error = new Error(ERROR_MESSAGES.MINIMUM_AMOUNT_REQUIRED);
    error.statusCode = 400;
    throw error;
  }

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpayKeyId || !razorpayKeySecret) {
    const error = new Error(ERROR_MESSAGES.PAYMENT_GATEWAY_NOT_CONFIGURED);
    error.statusCode = 500;
    throw error;
  }

  const razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });

  const timestamp = Date.now().toString().slice(-10);
  const userIdShort = userId.toString().slice(-8);
  const receipt = `WLT_${userIdShort}_${timestamp}`;

  const orderOptions = {
    amount: Math.round(parseFloat(amount) * 100),
    currency: 'INR',
    receipt,
    notes: {
      userId: userId.toString(),
      purpose: 'wallet_topup',
      fullTimestamp: Date.now().toString(),
    },
  };

  let razorOrder;
  const RAZORPAY_TIMEOUT = 10000; // 10 seconds

  try {
    razorOrder = await withTimeout(
      razorpay.orders.create(orderOptions),
      RAZORPAY_TIMEOUT,
      'Razorpay order creation timed out'
    );
  } catch (err) {
    console.warn('⚠️ Razorpay primary attempt failed or timed out:', err.message);

    // Fallback to Axios if SDK fails OR if it was a timeout (Axios might still work if SDK had internal issues)
    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    try {
      const response = await withTimeout(
        axios.post('https://api.razorpay.com/v1/orders', orderOptions, {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }),
        RAZORPAY_TIMEOUT,
        'Razorpay fallback request timed out'
      );
      razorOrder = response.data;
    } catch (fallbackErr) {
      console.error('❌ Razorpay fallback also failed:', fallbackErr.message);
      throw fallbackErr;
    }
  }

  return {
    amount: razorOrder.amount,
    orderId: razorOrder.id,
  };
};

exports.verifyAddFundsPayment = async (userId, paymentData) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = paymentData;

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    const error = new Error(ERROR_MESSAGES.PAYMENT_VERIFICATION_FAILED);
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wallet = await getOrCreateWallet(userId, session);
    const amountToAdd = parseFloat(amount);

    wallet.balance += amountToAdd;
    wallet.updatedAt = new Date();
    await wallet.save({ session });

    await WalletTransaction.create(
      [
        {
          walletId: wallet._id,
          userId,
          type: 'credit',
          source: 'payment',
          amount: amountToAdd,
          balanceAfter: wallet.balance,
          metadata: {
            razorpay_payment_id,
            razorpay_order_id,
            gateway: 'razorpay',
            paymentMethod: 'razorpay',
            reason: 'Funds added via Razorpay',
            timestamp: new Date().toISOString(),
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return {
      newBalance: wallet.balance,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
