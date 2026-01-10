



const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');
const statusCode = require('../../utils/statusCode');
const Property = require('../../models/property');
const walletService = require('../../services/user/walletService');
const PropertyBid = require('../../models/propertyBid');

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
            currentPage: 'reports'
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

        const properties = await Property.find(query)
            .populate('currentHighestBidder')
            .populate('sellerId', 'name email')
            .sort({ auctionEndsAt: -1 })
            .lean();

        res.render('profile/reports/propertyAuctionReports', {
            layout: userRole === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
            title: 'Property Auction Reports',
            properties,
            user: currentUser,
            userRole,
            currentPage: 'reports'
        });

    } catch (error) {
        console.error('Property Auction Report Error:', error);
        require('fs').writeFileSync('debug_error.log', new Date().toISOString() + '\n' + error.stack + '\n\n', { flag: 'a' });
        res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
            layout: (req.user || req.admin)?.role === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
            message: ERROR_MESSAGES.SERVER_ERROR,
        });
    }
};


exports.getBalanceReport = async (req, res) => {
    try {
        const currentUser = req.user || req.admin;

        if (!currentUser) {
            return res.redirect('/auth/login');
        }

        const userRole = currentUser.role || 'user';
        const userId = currentUser._id;

        const filters = {
            page: req.query.page,
            type: req.query.type,
            source: req.query.source,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
        };

        const data = await walletService.getAllTransactionsData(userId, filters);

        const pagination = {
            currentPage: data.currentPage,
            totalPages: data.totalPages,
            hasPrevPage: data.currentPage > 1,
            hasNextPage: data.currentPage < data.totalPages,
        };

        res.render('profile/allTransactions', {
            layout: userRole === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
            title: 'Balance Report',
            walletBalance: data.wallet.balance,
            transactions: data.transactions,
            pagination,
            user: currentUser,
            userRole,
            filters: {
                type: filters.type || '',
                source: filters.source || '',
                fromDate: filters.fromDate || '',
                toDate: filters.toDate || '',
            },
            availableSources: data.allSources,
            currentPage: 'reports'
        });

    } catch (error) {
        console.error('Balance Report Error:', error);
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


        const bids = await PropertyBid.find({ propertyId: id })
            .populate('bidderId', 'name email profileImage')
            .sort({ amount: -1 })
            .lean();

        res.render('profile/reports/auctionDetailReport', {
            layout: userRole === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
            title: 'Auction Detail Report',
            property,
            bids,
            user: currentUser,
            userRole,
            currentPage: 'reports'
        });

    } catch (error) {
        console.error('Auction Detail Report Error:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
            layout: (req.user || req.admin)?.role === 'admin' ? LAYOUTS.ADMIN_LAYOUT : LAYOUTS.USER_LAYOUT,
            message: ERROR_MESSAGES.SERVER_ERROR,
        });
    }
};
