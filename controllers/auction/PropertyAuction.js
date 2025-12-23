const AuctionService = require('../../services/auction/auctionService');
const statusCode = require('../../utils/statusCode');
const {
  AUCTION_STATUS,
  ERROR_MESSAGES,
  VIEWS,
  LAYOUTS,
  REDIRECTS,
} = require('../../utils/constants');

exports.liveAuctionPage = async (req, res) => {
  try {
    const data = await AuctionService.getAuctionPageData(req.params.propertyId);

    if (data.auctionStatus === AUCTION_STATUS.ENDED) {
      return res.redirect(`/auctions/won/${req.params.propertyId}`);
    }
    res.render(VIEWS.LIVE_AUCTION, {
      layout: LAYOUTS.USER_LAYOUT,
      propertyId: req.params.propertyId,
      user: req.user,
      ...data,
    });
  } catch (err) {
    if (err.message === ERROR_MESSAGES.INVALID_AUCTION) {
      return res.redirect(REDIRECTS.PROPERTIES);
    }

    console.error(err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};

exports.publisherLiveAuctionPage = async (req, res) => {
  try {
    const data = await AuctionService.getPublisherAuctionData(
      req.params.propertyId,
      req.user._id
    );

    if (data.auctionStatus === AUCTION_STATUS.ENDED) {
      return res.redirect(`/auctions/auction-result/${req.params.propertyId}`);
    }
    res.render(VIEWS.PUBLISHER_VIEW, {
      layout: LAYOUTS.USER_LAYOUT,
      propertyId: req.params.propertyId,
      user: req.user,
      ...data,
    });
  } catch (err) {
    if (err.message === ERROR_MESSAGES.INVALID_AUCTION) {
      return res.redirect(REDIRECTS.PROPERTIES);
    }
    if (err.message === ERROR_MESSAGES.UNAUTHORIZED) {
      return res.status(statusCode.FORBIDDEN).send(ERROR_MESSAGES.UNAUTHORIZED);
    }

    console.error(err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};

exports.getAuctionResult = async (req, res) => {
  try {
    const result = await AuctionService.getAuctionResult(
      req.params.propertyId,
      req.user._id
    );

    res.json({ success: true, result });
  } catch (err) {
    res
      .status(statusCode.NOT_FOUND)
      .json({ success: false, message: ERROR_MESSAGES.GENERIC_ERROR });
  }
};

exports.enableAutoBid = async (req, res) => {
  try {
    await AuctionService.enableAutoBid({
      propertyId: req.params.propertyId,
      userId: req.user._id,
      maxBid: req.body.maxBid,
    });

    res.redirect(`/auctions/live/${req.params.propertyId}`);
  } catch (err) {
    if (err.message === ERROR_MESSAGES.PAYMENT_REQUIRED) {
      return res.redirect(
        `/payments/initiate?type=property&id=${req.params.propertyId}`
      );
    }
    if (err.message === ERROR_MESSAGES.BID_TOO_LOW) {
      return res.redirect(`/auction/live/${req.params.propertyId}`);
    }

    console.error(err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};

exports.getAutoBidPage = async (req, res) => {
  try {
    const data = await AuctionService.getAutoBidPageData(
      req.params.propertyId,
      req.user._id
    );

    res.render(VIEWS.ENABLE_AUTO_BID, {
      layout: LAYOUTS.USER_LAYOUT,
      propertyId: req.params.propertyId,
      user: req.user,
      ...data,
    });
  } catch (err) {
    return res.redirect(REDIRECTS.PROPERTIES);
  }
};
