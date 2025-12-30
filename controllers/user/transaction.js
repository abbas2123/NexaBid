
const TransactionService = require('../../services/profile/transaction');
const statusCode = require('../../utils/statusCode');
const {LAYOUTS} = require('../../utils/constants');

exports.getTransaction = async (req, res) => {
  const page = Number(req.query.page || 1);

  const filters = {
    type: req.query.type || '',
    source: req.query.source || '',
    dateRange: req.query.dateRange || '',
  };

  const { transactions, totalPages } = await TransactionService.getTransacation(
    req.user._id,
    page,
    filters
  );
console.log("transactions:",transactions);
  res.render('profile/transaction', {
    layout: LAYOUTS.USER_LAYOUT,
    transactions,
    currentPage: page,
    totalPages,
    user: req.user,
    filters, // 👈 IMPORTANT
  });
};