const express = require('express');

const router = express.Router();
const authControler = require('../../controllers/vendor/tenderBid');
const authMiddleware = require('../../middlewares/authMiddleware');
const tenderUpload = require('../../middlewares/tenderTechForm');
const tenderUploads = require('../../middlewares/tenderFin');

router.get('/:id/bid', authMiddleware.protectRoute, authControler.getTenderTechBidForm);

router.post(
  '/upload/all/:id',
  authMiddleware.protectRoute,
  tenderUpload.fields([
    { name: 'proposalFiles', maxCount: 20 },
    { name: 'techFiles', maxCount: 20 },
  ]),
  authControler.uploadTechnicalPhase
);
router.get('/:id/financial', authMiddleware.protectRoute, authControler.getTenderFin);
router.post(
  '/uploads/:id/financial',
  authMiddleware.protectRoute,
  tenderUploads.fields([
    { name: 'finForms', maxCount: 20 },
    { name: 'quotationFiles', maxCount: 20 },
  ]),
  authControler.uploadFinancialPhase
);
module.exports = router;
