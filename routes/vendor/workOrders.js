const express = require('express');
const auth = require('../../middlewares/authMiddleware');
const controller = require('../../controllers/vendor/workOrderController');

const router = express.Router();

router.post('/user/work-orders/:workOrderId/notes', auth.protectRoute, controller.addNote);

router.post(
  '/user/work-orders/:workOrderId/milestones/:mid/review',
  auth.protectRoute,
  controller.reviewMilestone
);

router.post(
  '/user/work-orders/:workOrderId/proofs/:pid/approve',
  auth.protectRoute,
  controller.approveProof
);

router.post(
  '/user/work-orders/:workOrderId/proofs/:pid/reject',
  auth.protectRoute,
  controller.rejectProof
);

router.post(
  '/user/work-orders/:workOrderId/complete',
  auth.protectRoute,
  controller.completeWorkOrder
);

router.get(
  '/user/work-orders/download-report/:workOrderId',
  auth.protectRoute,
  controller.downloadReport
);

module.exports = router;
