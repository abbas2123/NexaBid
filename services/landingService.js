

const Property = require('../models/property');

exports.getLandingPageData = async () => {
  const now = new Date();

  const liveAuctions = await Property.find({
    isAuction: true,
    auctionStartsAt: { $lte: now },
    auctionEndsAt: { $gte: now },
    status: 'published',
  })
    .sort({ auctionEndsAt: 1 })
    .limit(6);

  const upcomingAuctions = await Property.find({
    isAuction: true,
    auctionStartsAt: { $gt: now },
    status: 'published',
  })
    .sort({ auctionStartsAt: 1 })
    .limit(6);

  const featuredProperties = await Property.find({
    deletedAt: null,
    verificationStatus: 'approved',
  }).limit(6);

  return {
    liveAuctions,
    upcomingAuctions,
    featuredProperties,
  };
};
