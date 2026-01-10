

const express = require('express');
const authControler = require('../../controllers/vendor/tenderBid');
const authMiddleware = require('../../middlewares/authMiddleware');
const uploads = require('../../middlewares/upload');

const router = express.Router();
router.get('/:id/bid', authMiddleware.protectRoute, authControler.getTenderTechBidForm);

router.post(
  '/upload/all/:id',
  authMiddleware.protectRoute,
  uploads('nexabid/tender_bids').fields([
    { name: 'proposalFiles', maxCount: 20 },
    { name: 'techFiles', maxCount: 20 },
  ]),
  authControler.uploadTechnicalPhase
);
router.get('/:id/financial', authMiddleware.protectRoute, authControler.getTenderFin);
router.post(
  '/uploads/:id/financial',
  authMiddleware.protectRoute,
  uploads('nexabid/tender_bids').fields([
    { name: 'finForms', maxCount: 20 },
    { name: 'quotationFiles', maxCount: 20 },
  ]),
  authControler.uploadFinancialPhase
);
module.exports = router;
