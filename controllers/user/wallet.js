const Wallet = require('../../models/wallet');
const WalletTransaction = require('../../models/walletTransaction');
const Razorpay = require('razorpay');
const crypto = require('crypto');


exports.getWalletPage = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log('📄 Loading wallet page for user:', userId);

   
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      console.log('⚠️ No wallet found, creating new wallet');
      wallet = await Wallet.create({
        userId,
        balance: 0,
      });
      console.log('✅ Wallet created:', wallet._id);
    }

    
    const transactions = await WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`💰 Wallet balance: ₹${wallet.balance}`);
    console.log(`📊 Found ${transactions.length} recent transactions`);

    res.render('profile/wallat', {
      layout: 'layouts/user/userLayout',
      walletBalance: wallet.balance,
      transactions,
      user: req.user,
    });
  } catch (error) {
    console.error('❌ Wallet page error:', error);
    res.status(500).send('Server error');
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log('📄 Loading all transactions for user:', userId);
    console.log('📋 Query params:', req.query);

    // Get wallet
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.redirect('/wallet');
    }

    // Get filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const transactionType = req.query.type; // 'credit' or 'debit'
    const source = req.query.source; // 'payment', 'refund', etc.
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;

    // Build query
    const query = { userId };

    // Filter by transaction type
    if (transactionType && ['credit', 'debit'].includes(transactionType)) {
      query.type = transactionType;
    }

    // Filter by source
    if (source) {
      query.source = source;
    }

    // Filter by date range
    if (fromDate || toDate) {
      query.createdAt = {};
      
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0); // Start of day
        query.createdAt.$gte = from;
      }
      
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999); // End of day
        query.createdAt.$lte = to;
      }
    }

    console.log('🔍 Filter query:', query);

    // Get transactions with filters
    const transactions = await WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalTransactions = await WalletTransaction.countDocuments(query);
    const totalPages = Math.ceil(totalTransactions / limit);

    console.log(`📊 Found ${transactions.length} transactions (Page ${page}/${totalPages})`);

    // Get unique sources for filter dropdown
    const allSources = await WalletTransaction.distinct('source', { userId });

    res.render('profile/allTransactions', {
      layout: 'layouts/user/userLayout',
      walletBalance: wallet.balance,
      transactions,
      currentPage: page,
      totalPages,
      totalTransactions,
      user: req.user,
      // Pass filters back to template
      filters: {
        type: transactionType || '',
        source: source || '',
        fromDate: fromDate || '',
        toDate: toDate || '',
      },
      availableSources: allSources,
    });
  } catch (error) {
    console.error('❌ Transactions page error:', error);
    res.status(500).send('Server error');
  }
};



exports.getWalletBalance = async (req, res) => {
  try {
    const userId = req.user._id;

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balance: 0,
      });
    }

    return res.json({
      success: true,
      balance: wallet.balance,
      currency: 'INR',
    });
  } catch (error) {
    console.error('❌ Get balance error:', error);
    return res.json({
      success: false,
      message: 'Failed to fetch balance',
    });
  }
};


exports.getAddFundsPage = async (req, res) => {
  try {
    const userId = req.user._id;

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balance: 0,
      });
    }

    res.render('profile/addFunds', {
      layout: 'layouts/user/userLayout',
      walletBalance: wallet.balance,
      user: req.user,
    });
  } catch (error) {
    console.error('❌ Add funds page error:', error);
    res.status(500).send('Server error');
  }
};


exports.createAddFundsOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;

    console.log('📝 Creating order request:', { amount, userId });

    // Validate amount
    if (!amount || amount < 100) {
      console.log('❌ Invalid amount:', amount);
      return res.json({
        success: false,
        message: 'Minimum amount is ₹100',
      });
    }

    // Check environment variables
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('❌ Razorpay credentials not found');
      return res.json({
        success: false,
        message: 'Payment gateway not configured. Please contact support.',
      });
    }

    console.log('🔑 Razorpay Key ID:', razorpayKeyId.substring(0, 15) + '...');

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // ✅ FIXED: Shorter receipt (max 40 chars)
    const timestamp = Date.now().toString().slice(-10); // Last 10 digits
    const userIdShort = userId.toString().slice(-8); // Last 8 chars of userId
    const receipt = `WLT_${userIdShort}_${timestamp}`; // Format: WLT_12345678_1234567890 (max 28 chars)

    const orderOptions = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: receipt, // ✅ Now within 40 char limit
      notes: {
        userId: userId.toString(),
        purpose: 'wallet_topup',
        fullTimestamp: Date.now().toString(),
      },
    };

    console.log('📦 Creating Razorpay order:', {
      ...orderOptions,
      receiptLength: receipt.length, // Should be < 40
    });

    const razorOrder = await razorpay.orders.create(orderOptions);

    console.log('✅ Razorpay order created:', razorOrder.id);

    return res.json({
      success: true,
      amount: razorOrder.amount,
      orderId: razorOrder.id,
    });
  } catch (error) {
    console.error('❌ Order creation error:', {
      name: error.name,
      message: error.message,
      description: error.description,
      code: error.code,
    });

    const errorMessage =
      error.description || error.message || 'Failed to create payment order';

    return res.json({
      success: false,
      message: errorMessage,
    });
  }
};




exports.verifyAddFundsPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      amount,
    } = req.body;
    const userId = req.user._id;

    console.log('💳 Verifying payment:', {
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      amount,
      userId,
    });

    // Verify signature
    const crypto = require('crypto');
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.log('❌ Signature verification failed');
      return res.json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    console.log('✅ Signature verified successfully');

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      console.log('⚠️ Creating new wallet for user');
      wallet = await Wallet.create({ userId, balance: 0 });
    }

    // Credit wallet
    const previousBalance = wallet.balance;
    wallet.balance += amount;
    wallet.updatedAt = new Date();
    await wallet.save();

    console.log('💰 Wallet credited:', {
      previousBalance,
      amountAdded: amount,
      newBalance: wallet.balance,
    });

    // ✅ FIXED: Create transaction record with valid enum value
    await WalletTransaction.create({
      walletId: wallet._id,
      userId,
      type: 'credit',
      source: 'payment', // ✅ Changed from 'razorpay' to 'payment'
      amount,
      balanceAfter: wallet.balance,
      metadata: {
        razorpay_payment_id,
        razorpay_order_id,
        gateway: 'razorpay',
        paymentMethod: 'razorpay',
        reason: 'Funds added via Razorpay',
        timestamp: new Date().toISOString(),
      },
    });

    console.log('✅ Transaction recorded successfully');

    return res.json({
      success: true,
      message: 'Payment successful',
      newBalance: wallet.balance,
    });
  } catch (error) {
    console.error('❌ Verify payment error:', error);
    return res.json({
      success: false,
      message: 'Payment verification failed: ' + error.message,
    });
  }
};

module.exports = exports;
