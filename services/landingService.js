const Property = require('../models/property');
const Tender = require('../models/tender');

exports.getLandingPageData = async () => {
  const now = new Date();
  const [liveAuctions, upcomingAuctions, featuredProperties, featuredTenders] = await Promise.all([
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
      .limit(6),

    Tender.find({
      status: 'published',
      isBlocked: { $ne: true },
      bidEndAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .limit(6),
  ]);

  return {
    liveAuctions,
    upcomingAuctions,
    featuredProperties,
    featuredTenders,
  };
};
