const router = require('express').Router();
const walletController = require('../../controllers/user/wallet');
const { protectRoute } = require('../../middlewares/authMiddleware');

router.get('/', protectRoute, walletController.getWalletPage);
router.get('/add-funds', protectRoute, walletController.getAddFundsPage);
router.get('/transactions', protectRoute, walletController.getAllTransactions);

router.get('/api/balance', protectRoute, walletController.getWalletBalance);
router.post('/api/create-order', protectRoute, walletController.createAddFundsOrder);
router.post('/api/verify-payment', protectRoute, walletController.verifyAddFundsPayment);
module.exports = router;
