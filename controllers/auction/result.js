const auctionResultService = require('../../services/auction/result');
const statusCode = require('../../utils/statusCode');
const {
  LAYOUTS,
  VIEWS,
  ERROR_MESSAGES,
  REDIRECTS,
} = require('../../utils/constants');

exports.loadAuctionResultPage = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const publisherId = req.user._id;

    const result = await auctionResultService.getAuctionResultForPublisher(
      propertyId,
      publisherId
    );

    res.render(VIEWS.AUCTION_RESULT_PUBLISHER, {
      layout: LAYOUTS.USER_LAYOUT,
      title: 'Auction Result',
      property: result.property,
      winningBid: result.winningBid,
      winner: result.winner,
      totalBids: result.totalBids,
    });
  } catch (err) {
    console.error('Auction Result Error:', err.message);

    res.status(statusCode.FORBIDDEN).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: err.message,
    });
  }
};

exports.loadBuyerAuctionResultPage = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const buyerId = req.user._id;

    const result = await auctionResultService.getBuyerAuctionResult(
      propertyId,
      buyerId
    );

    return res.render(VIEWS.AUCTION_RESULT_BUYER, {
      layout: LAYOUTS.USER_LAYOUT,
      title: 'Auction Won',
      property: result.property,
      winningBid: result.winningBid,
      seller: result.seller,
      totalBids: result.totalBids,
      user: req.user,
    });
  } catch (err) {
    console.error('Buyer Auction Result Error:', err.message);

    // Friendly redirects
    if (
      err.message === ERROR_MESSAGES.NOT_WINNER ||
      err.message === ERROR_MESSAGES.AUCTION_NOT_ENDED
    ) {
      return res.redirect(REDIRECTS.MY_BIDS);
    }

    res.status(statusCode.FORBIDDEN).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.LOAD_RESULT_FAILED,
      user: req.user,
    });
  }
};
