const express = require('express');

const router = express.Router();
const auctionController = require('../../controllers/auction/PropertyAuction');
const auctionResult = require('../../controllers/auction/result');
const userAuth = require('../../middlewares/authMiddleware');
const { LAYOUTS } = require('../../utils/constants');

router.get('/live/:propertyId', userAuth.protectRoute, auctionController.liveAuctionPage);
router.get(
  '/publisher/:propertyId',
  userAuth.protectRoute,
  auctionController.publisherLiveAuctionPage
);
router.get('/result/:propertyId', userAuth.protectRoute, auctionController.getAuctionResult);
router.get('/success/:propertyId', userAuth.protectRoute, auctionController.success);

router.get('/failed/:propertyId', userAuth.protectRoute, (req, res) => {
  res.render('acution/failed', {
    layout: LAYOUTS.USER_LAYOUT,
    propertyId: req.params.propertyId,
    user: req.user,
  });
});
router.get('/auto-bid/:propertyId', userAuth.protectRoute, auctionController.getAutoBidPage);
router.post('/auto-bid/:propertyId', userAuth.protectRoute, auctionController.enableAutoBid);

router.get(
  '/auction-result/:propertyId',
  userAuth.protectRoute,
  auctionResult.loadAuctionResultPage
);
router.get('/won/:propertyId', userAuth.protectRoute, auctionResult.loadBuyerAuctionResultPage);

module.exports = router;
