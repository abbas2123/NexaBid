const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/authMiddleware');
const controller = require('../../controllers/vendor/postAward');

// Notes
router.post('/user/work-orders/:workOrderId/notes', auth.protectRoute, controller.addNote);

// Milestones
router.post(
  '/user/work-orders/:workOrderId/milestones/:mid/review',
  auth.protectRoute,
  controller.reviewMilestone
);

// Proofs
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

// Complete
router.post(
  '/user/work-orders/:workOrderId/complete',
  auth.protectRoute,
  controller.completeWorkOrder
);

module.exports = router;
