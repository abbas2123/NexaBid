const Property = require('../../models/property');
const PropertyBid = require('../../models/propertyBid');
const Payment = require('../../models/payment');
const {
  AUCTION_STATUS,
  ERROR_MESSAGES,
  PAYMENT_STATUS,
  PAYMENT_TYPES,
  BID_STATUS,
} = require('../../utils/constants');

class AuctionService {
  static async getAuctionPageData(propertyId, userId) {
    const property = await Property.findById(propertyId)
      .populate('currentHighestBidder', 'name email')
      .lean();
    if (!property || !property.isAuction) {
      throw new Error(ERROR_MESSAGES.INVALID_AUCTION);
    }

    const now = new Date();
    const auctionStatus =
      now < property.auctionStartsAt
        ? AUCTION_STATUS.NOT_STARTED
        : now > property.auctionEndsAt
          ? AUCTION_STATUS.ENDED
          : AUCTION_STATUS.LIVE;

    let myAutoBidMax = 0;
    if (userId) {
      const myBid = await PropertyBid.findOne({
        propertyId,
        bidderId: userId,
        isAutoBid: true,
        bidStatus: BID_STATUS.ACTIVE,
      })
        .select('autoBidMax')
        .lean();

      if (myBid) {
        myAutoBidMax = myBid.autoBidMax;
      }
    }

    return {
      property,
      auctionStatus,
      basePrice: property.basePrice,
      currentHighestBid: property.currentHighestBid || 0,
      auctionStep: property.auctionStep || 1000,
      auctionStartsAt: property.auctionStartsAt,
      auctionEndsAt: property.auctionEndsAt,
      myAutoBidMax,
    };
  }

  static async getPublisherAuctionData(propertyId, sellerId) {
    const property = await Property.findById(propertyId)
      .populate('currentHighestBidder', 'name email')
      .lean();

    if (!property || !property.isAuction) {
      throw new Error(ERROR_MESSAGES.INVALID_AUCTION);
    }
    if (property.sellerId.toString() !== sellerId.toString()) {
      throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const now = new Date();
    let auctionStatus = AUCTION_STATUS.NOT_STARTED;
    if (now >= property.auctionStartsAt && now <= property.auctionEndsAt) {
      auctionStatus = AUCTION_STATUS.LIVE;
    } else if (now > property.auctionEndsAt) {
      auctionStatus = AUCTION_STATUS.ENDED;
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
    const property = await Property.findById(propertyId).populate('soldTo', 'name email');

    if (!property) {
      throw new Error(ERROR_MESSAGES.PROPERTY_NOT_FOUND);
    }

    if (property.soldTo && property.soldTo._id.toString() === userId.toString()) {
      return 'won';
    }
    return 'lost';
  }

  static async enableAutoBid({ propertyId, userId, maxBid }) {
    const property = await Property.findByIdAndUpdate(propertyId);

    if (!property || !property.isAuction) {
      throw new Error(ERROR_MESSAGES.INVALID_AUCTION);
    }

    if (Number(maxBid) <= property.currentHighestBid) {
      throw new Error(ERROR_MESSAGES.BID_TOO_LOW);
    }

    const participationPayment = await Payment.findOne({
      userId,
      contextId: propertyId,
      contextType: 'property',
      type: PAYMENT_TYPES.PARTICIPATION_FEE,
      status: PAYMENT_STATUS.SUCCESS,
    });

    if (!participationPayment) {
      throw new Error(ERROR_MESSAGES.PAYMENT_REQUIRED);
    }

    await PropertyBid.findOneAndUpdate(
      { propertyId, bidderId: userId },
      {
        propertyId,
        bidderId: userId,
        isAutoBid: true,
        autoBidMax: maxBid,
        amount: property.currentHighestBid || property.basePrice,
        bidStatus: BID_STATUS.ACTIVE,
        escrowPaymentId: participationPayment._id,
      },
      { upsert: true, new: true }
    );
    return true;
  }

  static async getAutoBidPageData(propertyId, userId) {
    const property = await Property.findById(propertyId).lean();

    if (!property || !property.isAuction) {
      throw new Error(ERROR_MESSAGES.INVALID_AUCTION);
    }

    const existingAutoBid = await PropertyBid.findOne({
      propertyId,
      bidderId: userId,
      isAutoBid: true,
    }).lean();

    return {
      property,
      autoBid: existingAutoBid || null,
      currentHighestBid: property.currentHighestBid || property.basePrice,
      auctionStep: property.auctionStep,
    };
  }

  static async handleAutoBids(propertyId, io) {
    let rounds = 0;
    while (rounds < 50) {
      const property = await Property.findById(propertyId);
      if (!property || !property.isAuction || new Date() > property.auctionEndsAt) break;

      const currentPrice = property.currentHighestBid || property.basePrice;
      const step = property.auctionStep || 1000;
      let nextBidAmount = currentPrice + step;

      const candidate = await PropertyBid.findOne({
        propertyId,
        isAutoBid: true,
        bidStatus: BID_STATUS.ACTIVE,
        bidderId: { $ne: property.currentHighestBidder },
        autoBidMax: { $gt: currentPrice },
      })
        .populate('bidderId', 'name')
        .sort({ autoBidMax: -1, updatedAt: 1 });

      if (!candidate) break;

      if (candidate.autoBidMax < nextBidAmount) {
        nextBidAmount = candidate.autoBidMax;
      }

      const updated = await Property.findOneAndUpdate(
        {
          _id: propertyId,
          currentHighestBid: { $lt: nextBidAmount },
        },
        {
          $set: {
            currentHighestBid: nextBidAmount,
            currentHighestBidder: candidate.bidderId._id,
          },
        },
        { new: true }
      );

      if (updated) {
        await PropertyBid.findOneAndUpdate(
          { propertyId, bidderId: candidate.bidderId._id },
          {
            amount: nextBidAmount,
            isAutoBid: true,

            escrowPaymentId: candidate.escrowPaymentId,
            autoBidMax: candidate.autoBidMax,
            bidStatus: BID_STATUS.ACTIVE,
          },
          { upsert: true }
        );

        const room = `auction_${propertyId}`;
        io.to(room).emit('new_bid', {
          amount: nextBidAmount,
          bidderId: candidate.bidderId._id,
          bidderName: candidate.bidderId.name,
          time: new Date(),
          isAutoBid: true,
        });

        console.log(`🤖 AutoBid: ${candidate.bidderId.name} placed ${nextBidAmount}`);
        rounds++;

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        continue;
      }
    }
  }
}

module.exports = AuctionService;
