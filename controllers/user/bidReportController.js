const bidReportService = require('../../services/user/bidReportService');
const { LAYOUTS } = require('../../utils/constants');
const statusCode = require('../../utils/statusCode');

exports.getBidReports = async (req, res) => {
    try {
        const currentUser = req.user || req.admin;
        if (!currentUser) {
            return res.redirect('/auth/login');
        }

        const userId = currentUser._id;
        const userRole = currentUser.role || (req.admin ? 'admin' : 'user');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const { bidType, status, searchQuery, startDate, endDate } = req.query;
        const filters = { bidType, status, searchQuery, startDate, endDate };

        // Delegate data fetching to service
        const { filteredBids, stats } = await bidReportService.getBidReportsData(userId, userRole, filters);

        const totalRecords = filteredBids.length;
        const totalPages = Math.ceil(totalRecords / limit);
        const paginatedBids = filteredBids.slice(skip, skip + limit);

        const layoutToUse = userRole === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT;

        res.render('user/myBids', {
            layout: layoutToUse,
            bids: paginatedBids,
            stats,
            currentPage: page,
            totalPages,
            totalRecords,
            limit,
            filters,
            user: req.user,
            admin: req.admin,
            userRole,
            title: 'My Bid Reports',
        });
    } catch (error) {
        console.error('Error fetching bid reports:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).render('error', { message: 'Failed to load bid reports' });
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
