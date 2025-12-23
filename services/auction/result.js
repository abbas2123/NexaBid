const Property = require('../../models/property');
const PropertyBid = require('../../models/propertyBid.js');
const User = require('../../models/user.js');

exports.getAuctionResultForPublisher = async (propertyId, publisherId) => {
  const property = await Property.findById(propertyId)
    .populate('sellerId', 'name email')
    .lean();
  console.log('property.media', property.media);
  if (!property) {
    throw new Error('property not found');
  }

  if (property.sellerId._id.toString() !== publisherId.toString()) {
    throw new Error('Unauthorized access');
  }

  if (property.isAuction && new Date() < property.auctionEndsAt) {
    throw new Error('Auction not ended yet');
  }

  const winningBid = await PropertyBid.findOne({ propertyId })
    .sort({ amount: -1 })
    .populate('bidderId', 'name email phone avatar')
    .lean();

  const totalBids = await PropertyBid.countDocuments({ propertyId });

  return {
    property,
    winningBid,
    winner: winningBid ? winningBid.bidderId : null,
    totalBids,
  };
};

exports.getBuyerAuctionResult = async (propertyId, buyerId) => {
  const property = await Property.findById(propertyId)
    .populate('sellerId', 'name email phone avatar')
    .lean();

  if (!property) {
    throw new Error('PROPERTY_NOT_FOUND');
  }
  if (!property.isAuction) {
    throw new Error('NOT_AN_AUCTION');
  }

  if (new Date() < property.auctionEndsAt) {
    throw new Error('AUCTION_NOT_ENDED');
  }

  const winningBid = await PropertyBid.findOne({ propertyId })
    .sort({ amount: -1 })
    .populate('bidderId', 'name email phone avatar')
    .lean();

  if (!winningBid) {
    throw new Error('NOW_BIDS_FOUND');
  }

  if (winningBid.bidderId._id.toString() !== buyerId.toString()) {
    throw new Error('NOT_WINNER');
  }

  const totalBids = await PropertyBid.countDocuments({ propertyId });

  return {
    property,
    winningBid,
    seller: property.sellerId,
    totalBids,
  };
};
