const auctionResultService = require('../../services/auction/result');
const statusCode = require('../../utils/statusCode');

exports.loadAuctionResultPage = async ( req, res)=>{
  try {
    const propertyId = req.params.propertyId;
    const publisherId = req.user._id;

    const result = await auctionResultService.getAuctionResultForPublisher(propertyId,publisherId);

    res.render('acution/result', {
      layout: 'layouts/user/userLayout',
      title: 'Auction Result',
      property: result.property,
      winningBid: result.winningBid,
      winner: result.winner,
      totalBids: result.totalBids,
    });
  }catch(err){
    console.error('Auction Result Error:',err.message);

    res.status(statusCode.FORBIDDEN).render('error', {
      layout: 'layouts/user/userLayout',
      message: err.message,
    });
  }
}

exports.loadBuyerAuctionResultPage = async ( req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const buyerId = req.user._id;

    const result = await auctionResultService.getBuyerAuctionResult(propertyId,buyerId);

    return res.render('acution/buyerWon', {
      layout: 'layouts/user/userLayout',
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
      err.message === 'NOT_WINNER' ||
      err.message === 'AUCTION_NOT_ENDED'
    ) {
      return res.redirect('/my-bids');
    }

    res.status(statusCode.FORBIDDEN).render('error', {
      layout: 'layouts/user/userLayout',
      message: 'Unable to load auction result',
      user: req.user,
    });
  }
  
}
