const express = require('express');
const router=express.Router();
const {
  getTenderEvaluationPage,
  acceptTechnicalEvaluation,
  rejectTechnicalEvaluation,
  selectWinner,getPublisherPostAwardPage
} = require("../../controllers/user/mylisting");

const {protectRoute} = require('../../middlewares/authMiddleware');

router.get("/owner/tender/:id/evaluation", protectRoute, getTenderEvaluationPage);

router.get("/evaluation/accept-tech/:bidId", protectRoute, acceptTechnicalEvaluation);
router.get("/evaluation/reject-tech/:bidId", protectRoute, rejectTechnicalEvaluation);
router.get("/evaluation/select-winner/:bidId", protectRoute, selectWinner);


module.exports=router;