const Property = require('../models/property');

module.exports = async()=>{
    const now = new Date();

    const props = await Property.find({
        isAuction:true,
        auctionEndsAt:{$lt:now},
        status:{$ne:"closed"}
    });

    for(let p of props){
        if(p.currentHighestBid>0&& p.currentHighestBidder){
            p.soldTo=p.currentHighestBidder;
            p.soldAt=now;
            p.status ='owned';
        }else{
            p.status='closed';
            p.soldTo=null;
            p.soldAt=null;

        }
        await p.save();
    }

    console.log('acution lifecycle updated');
}