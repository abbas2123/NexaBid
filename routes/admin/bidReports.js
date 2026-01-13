const express = require('express');
const controller = require('../../controllers/user/bidReportController');
const { adminProtect } = require('../../middlewares/adminAuth');
const router = express.Router();

router.get('/admin/reports/my-bids', adminProtect, controller.getBidReports);
router.post('/admin/reports/my-bids/export-pdf', adminProtect, controller.exportBidReportPDF);
module.exports = router;
