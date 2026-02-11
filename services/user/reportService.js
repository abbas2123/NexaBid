const Property = require('../../models/property');
const PropertyBid = require('../../models/propertyBid');
const WorkOrder = require('../../models/workOrder');

/**
 * Get Property Auction Reports for user
 */
exports.getPropertyAuctionReportsData = async (user, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const userRole = user.role || 'user';
    let query = { isAuction: true };

    if (userRole !== 'admin') {
        query.sellerId = user._id;
    }

    const totalRecords = await Property.countDocuments(query);
    const properties = await Property.find(query)
        .populate('currentHighestBidder')
        .populate('sellerId', 'name email')
        .sort({ auctionEndsAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const totalPages = Math.ceil(totalRecords / limit);

    return {
        properties,
        pagination: {
            currentPage: page,
            totalPages,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages,
        }
    };
};

/**
 * Get Auction Detail Report for user
 */
exports.getAuctionDetailReportData = async (user, propertyId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const userRole = user.role || 'user';

    const property = await Property.findById(propertyId)
        .populate('currentHighestBidder', 'name email phone')
        .populate('sellerId', 'name email')
        .lean();

    if (!property) return { error: 'PROPERTY_NOT_FOUND' };

    const sellerIdStr = property.sellerId ? property.sellerId._id.toString() : null;
    if (userRole !== 'admin' && sellerIdStr !== user._id.toString()) {
        return { error: 'UNAUTHORIZED' };
    }

    const totalRecords = await PropertyBid.countDocuments({ propertyId });
    const bids = await PropertyBid.find({ propertyId })
        .populate('bidderId', 'name email profileImage')
        .sort({ amount: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const totalPages = Math.ceil(totalRecords / limit);

    return {
        property,
        bids,
        pagination: {
            currentPage: page,
            totalPages,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages,
        }
    };
};

/**
 * Get Work Order Reports for user
 */
exports.getWorkOrderReportsData = async (user, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const userRole = user.role || 'user';
    let query = {};

    if (userRole === 'vendor') {
        query.vendorId = user._id;
    } else if (userRole !== 'admin') {
        query.issuedBy = user._id;
    }

    const totalRecords = await WorkOrder.countDocuments(query);
    const workOrders = await WorkOrder.find(query)
        .populate('tenderId', 'title')
        .populate('vendorId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const totalPages = Math.ceil(totalRecords / limit);

    return {
        workOrders,
        pagination: {
            currentPage: page,
            totalPages,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages,
        }
    };
};
