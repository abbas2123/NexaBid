const Payment = require('../../models/payment');
const WalletTransaction = require('../../models/walletTransaction');

exports.getTransacation = async (userId, page, filters) => {
  const limit = 10;
  const skip = (page - 1) * limit;

  const payments = await Payment.find({ userId }).lean();
  const walletTxns = await WalletTransaction.find({ userId }).lean();

  let ledger = [
    ...payments.map((p) => ({
      type: 'debit',
      source: p.gateway === 'wallet' ? 'wallet' : 'payment',
      amount: p.amount,
      transactionId: p.orderNumber || p.gatewayPaymentId,
      createdAt: p.createdAt,
    })),
    ...walletTxns.map((w) => ({
      type: 'credit',
      source: w.source || 'refund',
      amount: w.amount,
      transactionId: w.metadata?.paymentId || w._id,
      createdAt: w.createdAt,
    })),
  ];

  // Type filter
  if (filters.type) ledger = ledger.filter((x) => x.type === filters.type);

  // Source filter
  if (filters.source) ledger = ledger.filter((x) => x.source === filters.source);

  // Date filter
  if (filters.dateRange) {
    const now = new Date();
    ledger = ledger.filter((tx) => {
      const d = new Date(tx.createdAt);
      if (filters.dateRange === 'today') return d.toDateString() === now.toDateString();
      if (filters.dateRange === 'week') return d >= new Date(now - 7 * 86400000);
      if (filters.dateRange === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (filters.dateRange === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }

  ledger.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    transactions: ledger.slice(skip, skip + limit),
    totalPages: Math.ceil(ledger.length / limit),
  };
};
