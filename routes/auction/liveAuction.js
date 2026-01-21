const express = require('express');
const auctionController = require('../../controllers/auction/PropertyAuction');
const auctionResult = require('../../controllers/auction/result');
const userAuth = require('../../middlewares/authMiddleware');

const router = express.Router();
router.get('/live/:propertyId', userAuth.protectRoute, auctionController.liveAuctionPage);
router.get(
  '/publisher/:propertyId',
  userAuth.protectRoute,
  auctionController.publisherLiveAuctionPage
);
router.get('/result/:propertyId', userAuth.protectRoute, auctionController.getAuctionResult);
router.get('/success/:propertyId', userAuth.protectRoute, auctionController.success);
router.get('/failed/:propertyId', userAuth.protectRoute, auctionController.auctionLost);
router.get('/auto-bid/:propertyId', userAuth.protectRoute, auctionController.getAutoBidPage);
router.post('/auto-bid/:propertyId', userAuth.protectRoute, auctionController.enableAutoBid);
router.get(
  '/auction-result/:propertyId',
  userAuth.protectRoute,
  auctionResult.loadAuctionResultPage
);
router.get('/won/:propertyId', userAuth.protectRoute, auctionResult.loadBuyerAuctionResultPage);
module.exports = router;
