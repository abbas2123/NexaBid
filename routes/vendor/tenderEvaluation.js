const express = require('express');
const { protectRoute, vendorProtect } = require('../../middlewares/authMiddleware');
const controller = require('../../controllers/user/tenderEvaluationController');
const router = express.Router();

router.get(
  '/vendor/reports/tender-evaluation',
  protectRoute,
  vendorProtect,
  controller.getTenderEvaluation
);
router.post(
  '/vendor/reports/tender-evaluation/export-pdf',
  protectRoute,
  vendorProtect,
  controller.exportTenderEvaluationPDF
);
module.exports = router;
