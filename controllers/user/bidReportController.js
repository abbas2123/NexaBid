const bidReportService = require('../../services/user/bidReportService');
const { LAYOUTS } = require('../../utils/constants');
const statusCode = require('../../utils/statusCode');

exports.getBidReports = async (req, res, next) => {
    try {
        const currentUser = req.user || req.admin;
        if (!currentUser) {
            return res.redirect('/auth/login');
        }

        const userId = currentUser._id;
        const userRole = currentUser.role || (req.admin ? 'admin' : 'user');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;


        const { bidType, status, searchQuery, startDate, endDate } = req.query;
        const filters = { bidType, status, searchQuery, startDate, endDate };

        const { bids, stats, totalRecords } = await bidReportService.getBidReportsData(userId, userRole, filters, page, limit);

        const totalPages = Math.ceil(totalRecords / limit);
        const paginatedBids = bids;

        const layoutToUse = userRole === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT;

        res.render('user/myBids', {
            layout: layoutToUse,
            bids: paginatedBids,
            stats,
            title: 'My Bid Reports',
            filters,
            pagination: {
                currentPage: page,
                totalPages,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages,
            },
            queryParams: new URLSearchParams(req.query).toString() ? '&' + new URLSearchParams(req.query).toString() : '',
        });
    } catch (error) {
        next(error);
    }
};

exports.exportBidReportPDF = async (req, res) => {
    try {
        const currentUser = req.user || req.admin;
        if (!currentUser) {
            return res.status(statusCode.UNAUTHORIZED).json({ error: 'Unauthorized' });
        }

        const userRole = currentUser.role || (req.admin ? 'admin' : 'user');
        const { bidType, status, searchQuery, startDate, endDate } = req.body;
        const filters = { bidType, status, searchQuery, startDate, endDate };


        await bidReportService.generateBidReportPDF(res, currentUser, userRole, filters);
    } catch (error) {
        console.error('Error exporting PDF:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: 'Failed to export PDF' });
    }
};
