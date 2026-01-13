const express = require('express');
const { protectRoute } = require('../../middlewares/authMiddleware');
const router = express.Router();
const {
  getTenderEvaluationPage,
  acceptTechnicalEvaluation,
  rejectTechnicalEvaluation,
  selectWinner,
} = require('../../controllers/user/mylisting');
router.get('/owner/tender/:id/evaluation', protectRoute, getTenderEvaluationPage);
router.get('/evaluation/accept-tech/:bidId', protectRoute, acceptTechnicalEvaluation);
router.get('/evaluation/reject-tech/:bidId', protectRoute, rejectTechnicalEvaluation);
router.get('/evaluation/select-winner/:bidId', protectRoute, selectWinner);
module.exports = router;
