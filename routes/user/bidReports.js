const express = require('express');
const auth = require('../../middlewares/authMiddleware');
const controller = require('../../controllers/user/bidReportController');
const router = express.Router();
router.get('/user/reports/my-bids', auth.protectRoute, controller.getBidReports);
router.post('/user/reports/my-bids/export-pdf', auth.protectRoute, controller.exportBidReportPDF);
module.exports = router;
