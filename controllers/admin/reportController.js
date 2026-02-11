const reportService = require('../../services/admin/reportService');
const statusCode = require('../../utils/statusCode');
const { VIEWS, LAYOUTS, ERROR_MESSAGES } = require('../../utils/constants');
const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');

exports.getReportDashboard = async (req, res) => {
    try {
        const admin = req.admin;
        if (!admin) {
            return res.redirect('/admin/login');
        }

        res.render('admin/reports/dashboard', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            title: 'Admin Report Management',
            admin: admin,
            currentPage: 'reports',
        });
    } catch (error) {
        res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
            layout: LAYOUTS.ADMIN_LAYOUT,
            message: ERROR_MESSAGES.SERVER_ERROR,
            currentPage: 'reports',
            admin: req.admin,
            user: req.admin
        });
    }
};

exports.getPropertyAuctionReports = async (req, res) => {
    try {
        const admin = req.admin;
        if (!admin) return res.redirect('/admin/login');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const { properties, pagination } = await reportService.getPropertyAuctionReportsData(page, limit);

        res.render('admin/reports/propertyAuctionReports', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            title: 'Platform Auction Reports',
            properties,
            user: admin,
            userRole: 'admin',
            currentPage: 'reports',
            paginationData: pagination,
            queryParams: '',
            currentPaginationPage: page,
            limit
        });
    } catch (error) {
        console.error('Admin Auction Report Error:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
            layout: LAYOUTS.ADMIN_LAYOUT,
            message: ERROR_MESSAGES.SERVER_ERROR,
            currentPage: 'reports',
            admin: req.admin,
            user: req.admin
        });
    }
};

exports.getWorkOrderReports = async (req, res) => {
    try {
        const admin = req.admin;
        if (!admin) return res.redirect('/admin/login');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const { workOrders, pagination } = await reportService.getWorkOrderReportsData(page, limit);

        res.render('admin/reports/workOrderReports', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            title: 'Global Work Order Reports',
            workOrders,
            user: admin,
            userRole: 'admin',
            currentPage: 'reports',
            paginationData: pagination,
            queryParams: '',
            currentPaginationPage: page,
            limit
        });
    } catch (error) {
        console.error('Admin Work Order Report Error:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
            layout: LAYOUTS.ADMIN_LAYOUT,
            message: ERROR_MESSAGES.SERVER_ERROR,
            currentPage: 'reports',
            admin: req.admin,
            user: req.admin
        });
    }
};

exports.getAuctionDetailReport = async (req, res) => {
    try {
        const admin = req.admin;
        if (!admin) return res.redirect('/admin/login');

        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await reportService.getAuctionDetailReportData(id, page, limit);

        if (!result) {
            return res.status(statusCode.NOT_FOUND).render(VIEWS.ERROR, {
                layout: LAYOUTS.ADMIN_LAYOUT,
                message: ERROR_MESSAGES.PROPERTY_NOT_FOUND,
                currentPage: 'reports',
                admin: req.admin,
                user: req.admin
            });
        }

        res.render('admin/reports/auctionDetailReport', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            title: 'Admin Auction Detail',
            property: result.property,
            bids: result.bids,
            user: admin,
            userRole: 'admin',
            currentPage: 'reports',
            currentPaginationPage: page,
            totalPages: result.pagination.totalPages,
            totalRecords: result.pagination.totalRecords,
            limit
        });
    } catch (error) {
        console.error('Admin Auction Detail Report Error:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
            layout: LAYOUTS.ADMIN_LAYOUT,
            message: ERROR_MESSAGES.SERVER_ERROR,
            currentPage: 'reports',
            admin: req.admin,
            user: req.admin
        });
    }
};

exports.getAllBidReports = async (req, res) => {
    try {
        const admin = req.admin;
        if (!admin) return res.redirect('/admin/login');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const { bids, stats, pagination } = await reportService.getAllBidReportsData(req.query, page, limit);

        res.render('admin/reports/platformBidReports', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            bids,
            stats,
            paginationData: pagination,
            queryParams: new URLSearchParams(req.query).toString() ? '&' + new URLSearchParams(req.query).toString() : '',
            currentPaginationPage: page,
            totalPages: pagination.totalPages,
            totalRecords: pagination.totalRecords,
            limit,
            filters: req.query,
            user: admin,
            admin: admin,
            userRole: 'admin',
            currentPage: 'reports',
            title: 'Platform Bid Reports',
        });
    } catch (error) {
        console.error('Admin Bid Reports Error:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
            layout: LAYOUTS.ADMIN_LAYOUT,
            message: ERROR_MESSAGES.SERVER_ERROR,
            currentPage: 'reports',
            admin: req.admin,
            user: req.admin
        });
    }
};

exports.exportBidReportPDF = async (req, res) => {
    try {
        const admin = req.admin;
        if (!admin) return res.status(statusCode.UNAUTHORIZED).json({ error: 'Unauthorized' });

        res.status(501).json({ error: 'Admin PDF Export not fully implemented yet' });
    } catch (error) {
        console.error('Admin PDF Export Error:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({ error: 'Export failed' });
    }
};

exports.getPaymentAuditReport = async (req, res) => {
    try {
        const admin = req.admin;
        if (!admin) return res.redirect('/admin/login');

        const page = parseInt(req.query.page) || 1;
        const limit = 10;

        const { payments, stats, pagination } = await reportService.getPaymentAuditReportData(req.query, page, limit);

        res.render('admin/reports/paymentAudit', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            title: 'Payment Audit Report',
            payments,
            stats,
            paginationData: pagination,
            queryParams: new URLSearchParams(req.query).toString() ? '&' + new URLSearchParams(req.query).toString() : '',
            currentPaginationPage: page,
            totalPages: pagination.totalPages,
            totalRecords: pagination.totalRecords,
            limit,
            filters: req.query,
            user: admin,
            userRole: 'admin',
            currentPage: 'reports',
        });

    } catch (error) {
        console.error('Payment Audit Error:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
            layout: LAYOUTS.ADMIN_LAYOUT,
            message: ERROR_MESSAGES.SERVER_ERROR,
            currentPage: 'reports',
            admin: req.admin,
            user: req.admin
        });
    }
};

exports.getTenderEvaluation = async (req, res) => {
    try {
        const admin = req.admin;
        if (!admin) return res.redirect('/admin/login');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const { tenders, stats, pagination } = await reportService.getTenderEvaluationData(req.query, page, limit);

        res.render('admin/reports/tenderEvaluation', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            title: 'Tender Evaluation Reports',
            tenders,
            stats,
            pagination,
            queryParams: new URLSearchParams(req.query).toString() ? '&' + new URLSearchParams(req.query).toString() : '',
            currentPaginationPage: page,
            limit,
            filters: req.query,
            userRole: 'admin',
            user: admin,
            admin: admin,
            currentPage: 'reports',
        });

    } catch (error) {
        console.error('Admin Tender Evaluation Error:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
            layout: LAYOUTS.ADMIN_LAYOUT,
            message: ERROR_MESSAGES.ERROR_FETCHING_TENDER_REPORTS || 'Error fetching reports',
            currentPage: 'reports',
            admin: req.admin,
            user: req.admin
        });
    }
};

exports.exportTenderEvaluationPDF = async (req, res) => {
    try {
        const PDFDocument = require('pdfkit');
        const admin = req.admin;
        if (!admin) return res.status(401).json({ message: 'Unauthorized' });

        const { status, searchQuery, startDate, endDate } = req.body;
        let query = {};

        if (status) query.status = status;
        if (searchQuery) query.title = { $regex: searchQuery, $options: 'i' };

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const tenders = await Tender.find(query)
            .sort({ createdAt: -1 })
            .populate('awardedTo', 'name')
            .lean();


        let activeCount = 0;
        let completedCount = 0;

        const tenderIds = tenders.map(t => t._id);
        const allBids = await TenderBid.find({
            tenderId: { $in: tenderIds },
            status: { $ne: 'draft' },
        }).select('tenderId quotes.amount status');

        const bidsMap = {};
        allBids.forEach(bid => {
            if (!bidsMap[bid.tenderId]) bidsMap[bid.tenderId] = [];
            bidsMap[bid.tenderId].push(bid);
        });

        const tendersWithStats = tenders.map((tender) => {
            const bids = bidsMap[tender._id] || [];
            const validBids = bids.filter((b) => b.quotes && b.quotes.amount > 0);
            const bidAmounts = validBids.map((b) => b.quotes.amount);

            if (tender.status === 'published') activeCount++;
            if (['awarded', 'closed'].includes(tender.status)) completedCount++;

            return {
                ...tender,
                totalBids: bids.length,
                minBid: bidAmounts.length ? Math.min(...bidAmounts) : 0,
                maxBid: bidAmounts.length ? Math.max(...bidAmounts) : 0,
                avgBid: bidAmounts.length ? bidAmounts.reduce((a, b) => a + b, 0) / bidAmounts.length : 0,
            };
        });

        const doc = new PDFDocument({ margin: 40, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=tender-evaluation-report.pdf');

        doc.pipe(res);



        doc.fontSize(20).text('Admin Tender Evaluation Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated by: ${admin.name} on ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        doc.text(`Total Tenders: ${tenders.length}`);
        doc.text(`Active: ${activeCount}`);
        doc.text(`Completed: ${completedCount}`);
        doc.moveDown(2);

        tendersWithStats.forEach((t, i) => {
            doc.text(`${i + 1}. ${t.title} [${t.status.toUpperCase()}]`);
            doc.text(`   Bids: ${t.totalBids}, Min: ${t.minBid}, Max: ${t.maxBid}`);
            doc.text(`   Winner: ${t.awardedTo ? t.awardedTo.name : '-'}`);
            doc.moveDown(0.5);
        });

        doc.end();

    } catch (error) {
        console.error('PDF Export Error:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message: 'Failed to export PDF' });
    }
};

exports.downloadWorkOrderReport = async (req, res) => {
    try {
        const { id } = req.params;
        const fileUrl = await reportService.getWorkOrderReportFileUrl(id);
        if (!fileUrl) {
            return res.status(statusCode.NOT_FOUND).send('Work Order Report not found');
        }
        res.redirect(fileUrl);
    } catch (error) {
        console.error('Download Work Order Report Error:', error);
        res.status(statusCode.INTERNAL_SERVER_ERROR).send('Error downloading report');
    }
};

