const express = require('express');
const controller = require('../../controllers/user/tenderEvaluationController');
const { adminProtect } = require('../../middlewares/adminAuth');
const router = express.Router();
router.get('/admin/reports/tender-evaluation', adminProtect, controller.getTenderEvaluation);
router.post(
  '/admin/reports/tender-evaluation/export-pdf',
  adminProtect,
  controller.exportTenderEvaluationPDF
);
module.exports = router;
