const Property = require('../../models/property');
const PropertyBid = require('../../models/propertyBid');

exports.liveAuctionPage = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const user = req.user;

    const property = await Property.findById(propertyId)
      .populate('currentHighestBidder', 'name email')
      .lean();

    if (!property || !property.isAuction) {
      return res.redirect('/properties');
    }

    const now = new Date();
    const auctionStatus =
      now < property.auctionStartsAt
        ? 'not_started'
        : now > property.auctionEndsAt
          ? 'ended'
          : 'live';

    res.render('acution/liveAuction', {
      layout: 'layouts/user/userLayout',

      // 🔥 REQUIRED BY EJS
      propertyId, // ✅ ADD THIS
      basePrice: property.basePrice,
      currentHighestBid: property.currentHighestBid || 0,
      auctionStep: property.auctionStep || 1000,
      auctionStartsAt: property.auctionStartsAt,
      auctionEndsAt: property.auctionEndsAt,
      auctionStatus,

      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.publisherLiveAuctionPage = async (req, res) => {
  try {
    console.log('admin hit');
    const propertyId = req.params.propertyId;
    const user = req.user;

    const property = await Property.findById(propertyId)
      .populate('currentHighestBidder', 'name email')
      .lean();

    if (!property || !property.isAuction) {
      return res.redirect('/properties');
    }

    // 🔐 Only owner
    if (property.sellerId.toString() !== user._id.toString()) {
      return res.status(403).send('Unauthorized');
    }

    const now = new Date();

    let auctionStatus = 'not_started';
    if (now >= property.auctionStartsAt && now <= property.auctionEndsAt) {
      auctionStatus = 'live';
    } else if (now > property.auctionEndsAt) {
      auctionStatus = 'ended';
    }

    const bids = await PropertyBid.find({ propertyId })
      .populate('bidderId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.render('acution/publisherView', {
      layout: 'layouts/user/userLayout',

      property,
      propertyId,
      auctionStatus,

      currentHighestBid: property.currentHighestBid || 0,
      highestBidder: property.currentHighestBidder,

      auctionStartsAt: property.auctionStartsAt,
      auctionEndsAt: property.auctionEndsAt,

      bids,
      user,
    });
  } catch (err) {
    console.error('Publisher Auction Error:', err);
    res.status(500).send('Server Error');
  }
};

exports.getAuctionResult = async (req, res) => {
  console.log('result route');
  const property = await Property.findById(req.params.propertyId).populate(
    'soldTo',
    'name email'
  );

  if (!property) {
    return res.status(404).json({ success: false });
  }

  if (
    property.soldTo &&
    property.soldTo._id.toString() === req.user._id.toString()
  ) {
    return res.json({ success: true, result: 'won' });
  }

  return res.json({ success: true, result: 'lost' });
};

exports.enableAutoBid = async (req, res) => {
  const userId = req.user._id;
  const { propertyId } = req.params;
  const { maxBid } = req.body;
  const autoBidMax = maxBid

  const property = await Property.findById(propertyId);
  if (!property || !property.isAuction) {
    return res.redirect('/properties');
  }

  if (Number(autoBidMax) <= property.currentHighestBid) {
    return res.redirect(`/auction/live/${propertyId}`);
  }

  await PropertyBid.findOneAndUpdate(
    { propertyId, bidderId: userId },
    {
      propertyId,
      bidderId: userId,
      isAutoBid: true,
      autoBidMax,
      amount: property.currentHighestBid || property.basePrice,
    },
    { upsert: true, new: true }
  );
  console.log('autoBid enabled')
  res.redirect(`/auctions/live/${propertyId}`);
};

exports.getAutoBidPage = async (req, res) => {
  const { propertyId } = req.params;
  const userId = req.user._id;

  const property = await Property.findById(propertyId).lean();
  console.log('jwfjowrjwrwrj');
  if (!property || !property.isAuction) {
    return res.redirect(`/properties`);
  }
  console.log('kjbdkjvbdvw')

  const existingAutoBid = await PropertyBid.findOne({
    propertyId,
    bidderId: userId,
    isAutoBid: true,
  }).lean();

  res.render('acution/enableAutoBid', {
    layout: 'layouts/user/userLayout',
    property,
    propertyId,
    currentHighestBid: property.currentHighestBid || property.basePrice,
    auctionStep: property.auctionStep,
    autoBid: existingAutoBid || null,
    user: req.user,
  });
};
