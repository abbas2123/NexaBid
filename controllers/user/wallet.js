const walletService = require('../../services/user/walletService');
const statusCode = require('../../utils/statusCode');
const { LAYOUTS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../utils/constants');

exports.getWalletPage = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('📄 Loading wallet page for user:', userId);

    const { wallet, transactions } = await walletService.getWalletPageData(userId);

    console.log(`💰 Wallet balance: ₹${wallet.balance}`);
    console.log(`📊 Found ${transactions.length} recent transactions`);

    res.render('profile/wallat', {
      layout: LAYOUTS.USER_LAYOUT,
      walletBalance: wallet.balance,
      transactions,
      user: req.user,
    });
  } catch (error) {
    console.error('❌ Wallet page error:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('📄 Loading all transactions for user:', userId);

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
    console.error('❌ Transactions page error:', error);
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
    console.error('❌ Get balance error:', error);
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
    console.error('❌ Add funds page error:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.createAddFundsOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;
    console.log('📝 Creating order request:', { amount, userId });

    const result = await walletService.createAddFundsOrder(userId, amount);

    return res.json({
      success: true,
      amount: result.amount,
      orderId: result.orderId,
    });
  } catch (error) {
    console.error('❌ Order creation error:', error.message);
    const errorMessage = error.statusCode === 400 ? error.message : 'Failed to create payment order';
    return res.json({
      success: false,
      message: errorMessage,
    });
  }
};

exports.verifyAddFundsPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const paymentData = req.body;
    console.log('💳 Verifying payment for user:', userId);

    const result = await walletService.verifyAddFundsPayment(userId, paymentData);

    console.log('✅ Payment verified and wallet updated');
    return res.json({
      success: true,
      message: SUCCESS_MESSAGES.PAYMENT_SUCCESSFUL,
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error('❌ Verify payment error:', error.message);
    return res.json({
      success: false,
      message: `Payment verification failed: ${error.message}`,
    });
  }
};

module.exports = exports;
