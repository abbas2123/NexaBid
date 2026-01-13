const express = require('express');
const authControler = require('../../controllers/vendor/tenderBid');
const { protectRoute, vendorProtect } = require('../../middlewares/authMiddleware');
const uploads = require('../../middlewares/upload');
const router = express.Router();

router.get('/:id/bid', protectRoute, vendorProtect, authControler.getTenderTechBidForm);

router.post(
  '/upload/all/:id',
  protectRoute,
  vendorProtect,
  uploads('nexabid/tender_bids').fields([
    { name: 'proposalFiles', maxCount: 20 },
    { name: 'techFiles', maxCount: 20 },
  ]),
  authControler.uploadTechnicalPhase
);

router.get('/:id/financial', protectRoute, vendorProtect, authControler.getTenderFin);

router.post(
  '/uploads/:id/financial',
  protectRoute,
  vendorProtect,
  uploads('nexabid/tender_bids').fields([
    { name: 'finForms', maxCount: 20 },
    { name: 'quotationFiles', maxCount: 20 },
  ]),
  authControler.uploadFinancialPhase
);
module.exports = router;
