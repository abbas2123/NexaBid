const propertyService = require('../../services/admin/propertyService');
const statusCode = require('../../utils/statusCode');
const Property = require('../../models/property');
const PropertyBid = require('../../models/propertyBid');
const {
  VIEWS,
  LAYOUTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  AUCTION_STATUS,
  REDIRECTS,
} = require('../../utils/constants');

exports.getAllProperties = async (req, res) => {
  try {
    const properties = await propertyService.getAllProperties();

    res.render(VIEWS.ADMIN_PROPERTY_MANAGEMENT, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      properties,
      currentPage: 'property-management',
    });
  } catch (err) {
    console.error('Error loading properties:', err);
    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

//
// GET DETAILS
//
exports.getPropertyDetails = async (req, res) => {
  try {
    const property = await propertyService.getPropertyDetails(req.params.id);

    if (!property) {
      return res
        .status(statusCode.NOT_FOUND)
        .json({ success: false, message: ERROR_MESSAGES.PROPERTY_NOT_FOUND });
    }

    res.json({ success: true, property });
  } catch (err) {
    console.error('DETAIL FETCH ERROR:', err);
    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
};

//
// APPROVE PROPERTY
//
exports.approveProperty = async (req, res) => {
  try {
    const serviceResponse = await propertyService.approvePropertyService(
      req.params.id,
      req.admin.id,
      req.body.approveMessage,
      req.app.get('io')
    );

    if (!serviceResponse) {
      return res
        .status(statusCode.NOT_FOUND)
        .json({ success: false, message: ERROR_MESSAGES.PROPERTY_NOT_FOUND });
    }

    res.json({ success: true, message: SUCCESS_MESSAGES.PROPERTY_APPROVED });
  } catch (err) {
    console.error('APPROVE ERROR:', err);
    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
};

//
// REJECT PROPERTY
//
exports.rejectProperty = async (req, res) => {
  try {
    const serviceResponse = await propertyService.rejectPropertyService(
      req.params.id,
      req.admin.id,
      req.body.rejectionMessage,
      req.app.get('io')
    );

    if (!serviceResponse) {
      return res
        .status(statusCode.NOT_FOUND)
        .json({ success: false, message: ERROR_MESSAGES.PROPERTY_NOT_FOUND });
    }

    res.json({ success: true, message: SUCCESS_MESSAGES.PROPERTY_REJECTED });
  } catch (err) {
    console.error('REJECT ERROR:', err);
    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
};

exports.adminLiveAuctionPage = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    if (!propertyId) {
      return res
        .status(statusCode.BAD_REQUEST)
        .send(ERROR_MESSAGES.PROPERTY_ID_MISSING);
    }

    const property = await Property.findById(propertyId)
      .populate('sellerId', 'name email')
      .populate('currentHighestBidder', 'name email')
      .lean();

    if (!property || !property.isAuction) {
      return res.redirect(REDIRECTS.ADMIN_PROPERTY_MANAGEMENT);
    }

    const bids = await PropertyBid.find({ propertyId })
      .populate('bidderId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    let auctionStatus = AUCTION_STATUS.NOT_STARTED;

    if (now >= property.auctionStartsAt && now <= property.auctionEndsAt) {
      auctionStatus = AUCTION_STATUS.LIVE;
    } else if (now > property.auctionEndsAt) {
      auctionStatus = AUCTION_STATUS.ENDED;
    }

    res.render(VIEWS.ADMIN_AUCTION_VIEW, {
      layout: LAYOUTS.ADMIN_LAYOUT,

      /** 🔑 IMPORTANT */
      currentPage: 'auction',

      property,
      bids,
      auctionStatus,
      currentHighestBid: property.currentHighestBid || 0,
      highestBidder: property.currentHighestBidder,
      auctionEndsAt: property.auctionEndsAt,
      propertyId: property._id,
      user: req.user,
    });
  } catch (err) {
    console.error('Admin Live Auction Error:', err);
    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .send(ERROR_MESSAGES.SERVER_ERROR);
  }
};
