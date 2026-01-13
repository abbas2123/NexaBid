const Property = require('../models/property');
exports.getLandingPageData = async () => {
  const now = new Date();
  // Run queries in parallel for better performance
  const [liveAuctions, upcomingAuctions, featuredProperties] = await Promise.all([
    Property.find({
      isAuction: true,
      auctionStartsAt: { $lte: now },
      auctionEndsAt: { $gte: now },
      status: 'published',
    })
      .sort({ auctionEndsAt: 1, _id: 1 })
      .limit(6),

    Property.find({
      isAuction: true,
      auctionStartsAt: { $gt: now },
      status: 'published',
    })
      .sort({ auctionStartsAt: 1, _id: 1 })
      .limit(6),

    Property.find({
      deletedAt: null,
      verificationStatus: 'approved',
    })
      .sort({ _id: -1 })
      .limit(6)
  ]);

  return {
    liveAuctions,
    upcomingAuctions,
    featuredProperties,
  };
};
