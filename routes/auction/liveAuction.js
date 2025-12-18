const express = require('express');
const router = express.Router();
const auctionController = require('../../controllers/auction/PropertyAuction');
const userAuth = require('../../middlewares/authMiddleware');

router.get('/live/:propertyId', userAuth.protectRoute, auctionController.liveAuctionPage);
router.get('/publisher/:propertyId', userAuth.protectRoute,auctionController.publisherLiveAuctionPage);
router.get('/result/:propertyId', userAuth.protectRoute, auctionController.getAuctionResult);
router.get('/success/:propertyId', userAuth.protectRoute, (req, res) => {
  res.render('acution/success', {
    layout: 'layouts/user/userLayout',
    propertyId: req.params.propertyId,
    user:req.user
  });
});

router.get('/failed/:propertyId', userAuth.protectRoute, (req, res) => {
  res.render('acution/failed', {
    layout: 'layouts/user/userLayout',
    propertyId: req.params.propertyId,
    user:req.user
  });
});
router.get('/auto-bid/:propertyId',userAuth.protectRoute,auctionController.getAutoBidPage);
router.post('/auto-bid/:propertyId',userAuth.protectRoute,auctionController.enableAutoBid);
module.exports = router;
