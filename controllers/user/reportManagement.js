const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');
const statusCode = require('../../utils/statusCode');
const Property = require('../../models/property');
const PropertyBid = require('../../models/propertyBid');
const WorkOrder = require('../../models/workOrder');
exports.getReportManagement = async (req, res) => {
  try {
    const currentUser = req.user || req.admin;
    if (!currentUser) {
      return res.redirect('/auth/login');
    }
    const userRole = currentUser.role || 'user';
    res.render('profile/reportManagement', {
      layout: userRole === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
      title: 'Report Management - NexaBid',
      userRole,
      user: currentUser,
      currentPage: 'reports',
    });
  } catch (error) {
    console.error('Report Management Error:', error);
    res.status(statusCode.INTERNAL_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
      user: req.user || req.admin,
    });
  }
};
exports.getPropertyAuctionReports = async (req, res) => {
  try {
    const currentUser = req.user || req.admin;
    if (!currentUser) {
      return res.redirect('/auth/login');
    }
    const userRole = currentUser.role || 'user';
    let query = { isAuction: true };
    if (userRole !== 'admin') {
      query.sellerId = currentUser._id;
    }
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalRecords = await Property.countDocuments(query);
    const properties = await Property.find(query)
      .populate('currentHighestBidder')
      .populate('sellerId', 'name email')
      .sort({ auctionEndsAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalRecords / limit);

    res.render('profile/reports/propertyAuctionReports', {
      layout: userRole === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
      title: 'Property Auction Reports',
      properties,
      user: currentUser,
      userRole,
      currentPage: 'reports',
      pagination: {
        currentPage: page,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
      queryParams: '',
    });
  } catch (error) {
    console.error('Property Auction Report Error:', error);
    require('fs').writeFileSync(
      'debug_error.log',
      new Date().toISOString() + '\n' + error.stack + '\n\n',
      { flag: 'a' }
    );
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout:
        (req.user || req.admin)?.role === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
exports.getAuctionDetailReport = async (req, res) => {
  try {
    const currentUser = req.user || req.admin;
    if (!currentUser) {
      return res.redirect('/auth/login');
    }
    const { id } = req.params;
    const userRole = currentUser.role || 'user';
    const property = await Property.findById(id)
      .populate('currentHighestBidder', 'name email phone')
      .populate('sellerId', 'name email')
      .lean();
    if (!property) {
      return res.status(statusCode.NOT_FOUND).render(VIEWS.ERROR, {
        layout: userRole === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
        message: ERROR_MESSAGES.PROPERTY_NOT_FOUND,
      });
    }
    const sellerIdStr = property.sellerId ? property.sellerId._id.toString() : null;
    if (userRole !== 'admin' && sellerIdStr !== currentUser._id.toString()) {
      return res.status(statusCode.FORBIDDEN).render(VIEWS.ERROR, {
        layout: LAYOUTS.USER_LAYOUT,
        message: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalRecords = await PropertyBid.countDocuments({ propertyId: id });
    const bids = await PropertyBid.find({ propertyId: id })
      .populate('bidderId', 'name email profileImage')
      .sort({ amount: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalRecords / limit);

    res.render('profile/reports/auctionDetailReport', {
      layout: userRole === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
      title: 'Auction Detail Report',
      property,
      bids,
      user: currentUser,
      userRole,
      currentPage: 'reports',
      pagination: {
        currentPage: page,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
      queryParams: '',
    });
  } catch (error) {
    console.error('Auction Detail Report Error:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout:
        (req.user || req.admin)?.role === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
exports.getWorkOrderReports = async (req, res) => {
  try {
    const currentUser = req.user || req.admin;
    if (!currentUser) return res.redirect('/auth/login');
    const userRole = currentUser.role || 'user';
    let query = {};
    if (userRole === 'vendor') {
      query.vendorId = currentUser._id;
    } else if (userRole !== 'admin') {
      query.issuedBy = currentUser._id;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalRecords = await WorkOrder.countDocuments(query);

    const workOrders = await WorkOrder.find(query)
      .populate('tenderId', 'title')
      .populate('vendorId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalRecords / limit);

    res.render('profile/reports/workOrderReports', {
      layout: userRole === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
      title: 'Work Order Reports',
      workOrders,
      user: currentUser,
      userRole,
      currentPage: 'reports',
      pagination: {
        currentPage: page,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
      queryParams: '',
    });
  } catch (error) {
    console.error('Work Order Report Error:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout:
        (req.user || req.admin)?.role === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
