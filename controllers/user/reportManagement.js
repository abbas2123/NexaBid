const reportService = require('../../services/user/reportService');
const statusCode = require('../../utils/statusCode');
const { VIEWS, LAYOUTS, ERROR_MESSAGES } = require('../../utils/constants');

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

    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const { properties, pagination } = await reportService.getPropertyAuctionReportsData(currentUser, page, limit);

    res.render('profile/reports/propertyAuctionReports', {
      layout: (currentUser.role === 'admin') ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
      title: 'Property Auction Reports',
      properties,
      user: currentUser,
      userRole: currentUser.role || 'user',
      currentPage: 'reports',
      pagination,
      queryParams: '',
    });
  } catch (error) {
    console.error('Property Auction Report Error:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: (req.user || req.admin)?.role === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
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
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const result = await reportService.getAuctionDetailReportData(currentUser, id, page, limit);

    if (result.error) {
      if (result.error === 'PROPERTY_NOT_FOUND') {
        return res.status(statusCode.NOT_FOUND).render(VIEWS.ERROR, {
          layout: (currentUser.role === 'admin') ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
          message: ERROR_MESSAGES.PROPERTY_NOT_FOUND,
        });
      }
      if (result.error === 'UNAUTHORIZED') {
        return res.status(statusCode.FORBIDDEN).render(VIEWS.ERROR, {
          layout: LAYOUTS.USER_LAYOUT,
          message: ERROR_MESSAGES.UNAUTHORIZED,
        });
      }
    }

    res.render('profile/reports/auctionDetailReport', {
      layout: (currentUser.role === 'admin') ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
      title: 'Auction Detail Report',
      property: result.property,
      bids: result.bids,
      user: currentUser,
      userRole: currentUser.role || 'user',
      currentPage: 'reports',
      pagination: result.pagination,
      queryParams: '',
    });
  } catch (error) {
    console.error('Auction Detail Report Error:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: (req.user || req.admin)?.role === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};

exports.getWorkOrderReports = async (req, res) => {
  try {
    const currentUser = req.user || req.admin;
    if (!currentUser) return res.redirect('/auth/login');

    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const { workOrders, pagination } = await reportService.getWorkOrderReportsData(currentUser, page, limit);

    res.render('profile/reports/workOrderReports', {
      layout: (currentUser.role === 'admin') ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
      title: 'Work Order Reports',
      workOrders,
      user: currentUser,
      userRole: currentUser.role || 'user',
      currentPage: 'reports',
      pagination,
      queryParams: '',
    });
  } catch (error) {
    console.error('Work Order Report Error:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: (req.user || req.admin)?.role === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
