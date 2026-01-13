const router = require('express').Router();
const paymentController = require('../../controllers/vendor/paymentControler');
const { protectRoute } = require('../../middlewares/authMiddleware');
router.get('/initiate/:id', protectRoute, paymentController.initiateTenderPayment);
router.post('/confirm', protectRoute, paymentController.confirmCashPayment);
module.exports = router;
