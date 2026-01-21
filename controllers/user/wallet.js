const walletService = require('../../services/user/walletService');
const statusCode = require('../../utils/statusCode');
const { LAYOUTS, ERROR_MESSAGES, _SUCCESS_MESSAGES } = require('../../utils/constants');

exports.getWalletPage = async (req, res) => {
  try {
    const userId = req.user._id;

    const { wallet, transactions } = await walletService.getWalletPageData(userId);

    res.render('profile/wallat', {
      layout: LAYOUTS.USER_LAYOUT,
      walletBalance: wallet.balance,
      transactions,
      user: req.user,
    });
  } catch (error) {
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const userId = req.user._id;

    const data = await walletService.getAllTransactionsData(userId, req.query);

    res.render('profile/allTransactions', {
      layout: LAYOUTS.USER_LAYOUT,
      walletBalance: data.wallet.balance,
      transactions: data.transactions,
      pagination: {
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        totalTransactions: data.totalTransactions,
        hasPrevPage: data.currentPage > 1,
        hasNextPage: data.currentPage < data.totalPages,
      },
      user: req.user,
      filters: {
        type: req.query.type || '',
        source: req.query.source || '',
        fromDate: req.query.fromDate || '',
        toDate: req.query.toDate || '',
      },
      availableSources: data.allSources,
    });
  } catch (error) {
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.getWalletBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    const { balance, currency } = await walletService.getWalletBalance(userId);

    return res.json({
      success: true,
      balance,
      currency,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: ERROR_MESSAGES.FAILED_FETCH_BALANCE,
    });
  }
};

exports.getAddFundsPage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { walletBalance } = await walletService.getAddFundsPageData(userId);

    res.render('profile/addFunds', {
      layout: LAYOUTS.USER_LAYOUT,
      walletBalance,
      user: req.user,
    });
  } catch (error) {
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.createAddFundsOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;

    const result = await walletService.createAddFundsOrder(userId, amount);

    return res.json({
      success: true,
      amount: result.amount,
      orderId: result.orderId,
    });
  } catch (error) {
    const errorMessage = error.statusCode === 400 ? error.message : 'Failed to create payment order';
    return res.json({
      success: false,
      message: errorMessage,
    });
  }
};

exports.verifyAddFundsPayment = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.query.userId;

    if (!userId) {
      throw new Error('User identification failed');
    }
    const paymentData = req.body;

    if (!paymentData.razorpay_payment_id || !paymentData.razorpay_order_id || !paymentData.razorpay_signature) {
      throw new Error('Invalid payment data provided');
    }

    const result = await walletService.verifyAddFundsPayment(userId, paymentData);

    return res.redirect('/wallet?success=true&amount=' + (paymentData.amount || result.newBalance));

  } catch (error) {
    return res.redirect(`/wallet?error=${encodeURIComponent(error.message)}`);
  }
};

module.exports = exports;
