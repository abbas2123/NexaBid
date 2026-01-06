const Property = require('../../models/property');
const PropertyBid = require('../../models/propertyBid.js');
const { ERROR_MESSAGES } = require('../../utils/constants');

exports.getAuctionResultForPublisher = async (propertyId, publisherId) => {
  const property = await Property.findById(propertyId).populate('sellerId', 'name email').lean();
  console.log('property.media', property.media);
  if (!property) {
    throw new Error(ERROR_MESSAGES.PROPERTY_NOT_FOUND);
  }

  if (property.sellerId._id.toString() !== publisherId.toString()) {
    throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
  }

  if (property.isAuction && new Date() < property.auctionEndsAt) {
    throw new Error(ERROR_MESSAGES.AUCTION_NOT_ENDED);
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
    throw new Error(ERROR_MESSAGES.PROPERTY_NOT_FOUND);
  }
  if (!property.isAuction) {
    throw new Error(ERROR_MESSAGES.INVALID_AUCTION);
  }

  if (new Date() < property.auctionEndsAt) {
    throw new Error(ERROR_MESSAGES.AUCTION_NOT_ENDED);
  }

  const winningBid = await PropertyBid.findOne({ propertyId })
    .sort({ amount: -1 })
    .populate('bidderId', 'name email phone avatar')
    .lean();

  if (!winningBid) {
    throw new Error(ERROR_MESSAGES.NO_BIDS_FOUND);
  }

  if (winningBid.bidderId._id.toString() !== buyerId.toString()) {
    throw new Error(ERROR_MESSAGES.NOT_WINNER);
  }

  const totalBids = await PropertyBid.countDocuments({ propertyId });

  return {
    property,
    winningBid,
    seller: property.sellerId,
    totalBids,
  };
};
