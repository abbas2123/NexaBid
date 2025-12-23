const express = require('express');
const router = express.Router();
const auctionController = require('../../controllers/auction/PropertyAuction');
const auctionResult = require('../../controllers/auction/result');
const userAuth = require('../../middlewares/authMiddleware');
const Property = require('../../models/property');

router.get(
  '/live/:propertyId',
  userAuth.protectRoute,
  auctionController.liveAuctionPage
);
router.get(
  '/publisher/:propertyId',
  userAuth.protectRoute,
  auctionController.publisherLiveAuctionPage
);
router.get(
  '/result/:propertyId',
  userAuth.protectRoute,
  auctionController.getAuctionResult
);
router.get('/success/:propertyId', userAuth.protectRoute, async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const userId = req.user._id;

    
    const property = await Property.findById(propertyId)
      .populate('soldTo', 'name email')
      .lean();

    if (!property) {
      return res.redirect('/properties');
    }

    
    if (
      property.soldTo &&
      property.soldTo._id.toString() !== userId.toString()
    ) {
      return res.redirect('/properties'); 
    }

    res.render('acution/success', {
      layout: 'layouts/user/userLayout',
      property,
      propertyId,
      user: req.user,
    });
  } catch (err) {
    console.error('Auction success page error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/failed/:propertyId', userAuth.protectRoute, (req, res) => {
  res.render('acution/failed', {
    layout: 'layouts/user/userLayout',
    propertyId: req.params.propertyId,
    user: req.user,
  });
});
router.get(
  '/auto-bid/:propertyId',
  userAuth.protectRoute,
  auctionController.getAutoBidPage
);
router.post(
  '/auto-bid/:propertyId',
  userAuth.protectRoute,
  auctionController.enableAutoBid
);

router.get(
  '/auction-result/:propertyId',
  userAuth.protectRoute,
  auctionResult.loadAuctionResultPage
);
router.get(
  '/won/:propertyId',
  userAuth.protectRoute,
  auctionResult.loadBuyerAuctionResultPage
);

module.exports = router;
