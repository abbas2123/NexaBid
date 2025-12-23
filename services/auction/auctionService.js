const Property = require('../../models/property');
const PropertyBid = require('../../models/propertyBid');
const Payment = require('../../models/payment');


class AuctionService {
  static async getAuctionPageData(propertyId) {
    const property = await Property.findById(propertyId)
      .populate('currentHighestBidder', 'name email')
      .lean();
    if (!property || !property.isAuction) {
      throw new Error('INVALID_AUCTION');
    }

    const now = new Date();
    const auctionStatus =
      now < property.auctionStartsAt
        ? 'not_satarted' 
        : now > property.auctionEndsAt
          ? 'ended'
          : 'live';

    return {
      property,
      auctionStatus,
      basePrice: property.basePrice,
      currentHighestBid: property.currentHighestBid || 0,
      auctionStep: property.auctionStep || 1000,
      auctionStartsAt: property.auctionStartsAt,
      auctionEndsAt: property.auctionEndsAt,
    };
  }

  static async getPublisherAuctionData(propertyId, sellerId) {
    const property = await Property.findById(propertyId)
      .populate('currentHighestBidder', 'name email')
      .lean();

    if (!property || !property.isAuction) {
      throw new Error('INVALID_AUCTION');
    }
    if (property.sellerId.toString() !== sellerId.toString()) {
      throw new Error('UNAUTHORIZED');
    }

    const now = new Date();
    let auctionStatus = 'not_started';
    if (now >= property.auctionStartsAt && now <= property.auctionEndsAt) {
      auctionStatus = 'live';
    } else if (now > property.auctionEndsAt) {
      auctionStatus = 'ended';
    }

    const bids = await PropertyBid.find({ propertyId })
      .populate('bidderId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return {
      property,
      bids,
      auctionStatus,
      currentHighestBid: property.currentHighestBid || 0,
      highestBidder: property.currentHighestBidder,
      auctionStartsAt: property.auctionStartsAt,
      auctionEndsAt: property.auctionEndsAt,
    };
  }

  static async getAuctionResult(propertyId, userId) {
    const property = await Property.findById(propertyId).populate(
      'soldTo',
      'name email'
    );

    if (!property) {
      throw new Error('NOT_FOUND');
    }

    if (
      property.soldTo &&
      property.soldTo._id.toString() === userId.toString()
    ) {
      return 'won';
    }
    return 'lost';
  }

  static async enableAutoBid({ propertyId, userId, maxBid }) {
    const property = await Property.findByIdAndUpdate(propertyId);

    if (!property || !property.isAuction) {
      throw new Error('INVALID_AUCTION');
    }

    if (Number(maxBid) <= property.currentHighestBid) {
      throw new Error('BID_TOO_LOW');
    }

    const participationPayment = await Payment.findOne({
      userId,
      contextId: propertyId,
      contextType: 'partication_fee',
      statis: 'success',
    });

    if (!participationPayment) {
      throw new Error('PAYMENT_REQUIRED');
    }

    await PropertyBid.findOneAndUpdate(
      { propertyId, bidderId: userId },
      {
        propertyId,
        bidderId: userId,
        isAutoBid: true,
        autoBidMax: maxBid,
        amount: property.currentHighestBid || property.basePrice,
        bidStatus: 'active',
        escrowPaymentId: participationPayment._id,
      },
      { upsert: true, new: true }
    );
    return true;
  }

  static async getAutoBidPageData(propertyId,userId){
    const property = await Property.findById(propertyId).lean();

    if(!property || !property.isAuction){
      throw new Error('INVALID_AUCTION');
    }

    const existingAutoBid = await PropertyBid.findOne({
      propertyId,
      bidderId: userId,
      isAutoBid:true,
    }).lean();

    return {
      property,
      autoBid: existingAutoBid || null,
      currentHighestBid: property.currentHighestBid || property.basePrice,
      auctionStep: property.auctionStep,
    };
  }
}

module.exports = AuctionService;
