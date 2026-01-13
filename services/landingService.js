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
      isBlocked: { $ne: true },
    })
      .sort({ auctionEndsAt: 1, _id: 1 })
      .limit(6),

    Property.find({
      isAuction: true,
      auctionStartsAt: { $gt: now },
      status: 'published',
      isBlocked: { $ne: true },
    })
      .sort({ auctionStartsAt: 1, _id: 1 })
      .limit(6),

    Property.find({
      deletedAt: null,
      verificationStatus: 'approved',
      isBlocked: { $ne: true },
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
