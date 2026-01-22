const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');
const statusCode = require('../../utils/statusCode');
const Property = require('../../models/property');
const PropertyBid = require('../../models/propertyBid');
const TenderBid = require('../../models/tenderBid');
const Tender = require('../../models/tender');
const Payment = require('../../models/payment');
const WorkOrder = require('../../models/workOrder');

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
        const skip = (page - 1) * limit;

        const query = { isAuction: true };

        const totalRecords = await Property.countDocuments(query);
        const properties = await Property.find(query)
            .populate('currentHighestBidder')
            .populate('sellerId', 'name email')
            .sort({ auctionEndsAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalPages = Math.ceil(totalRecords / limit);

        res.render('admin/reports/propertyAuctionReports', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            title: 'Platform Auction Reports',
            properties,
            user: admin,
            userRole: 'admin',
            currentPage: 'reports',
            paginationData: {
                currentPage: page,
                totalPages,
                totalRecords,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages
            },
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
        const skip = (page - 1) * limit;

        const totalRecords = await WorkOrder.countDocuments({});
        const workOrders = await WorkOrder.find({})
            .populate('tenderId', 'title')
            .populate('vendorId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalPages = Math.ceil(totalRecords / limit);

        res.render('admin/reports/workOrderReports', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            title: 'Global Work Order Reports',
            workOrders,
            user: admin,
            userRole: 'admin',
            currentPage: 'reports',
            paginationData: {
                currentPage: page,
                totalPages,
                totalRecords,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages
            },
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
        const skip = (page - 1) * limit;

        const property = await Property.findById(id)
            .populate('currentHighestBidder', 'name email phone')
            .populate('sellerId', 'name email')
            .lean();

        if (!property) {
            return res.status(statusCode.NOT_FOUND).render(VIEWS.ERROR, {
                layout: LAYOUTS.ADMIN_LAYOUT,
                message: ERROR_MESSAGES.PROPERTY_NOT_FOUND,
                currentPage: 'reports',
                admin: req.admin,
                user: req.admin
            });
        }

        const totalRecords = await PropertyBid.countDocuments({ propertyId: id });
        const bids = await PropertyBid.find({ propertyId: id })
            .populate('bidderId', 'name email profileImage')
            .sort({ amount: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalPages = Math.ceil(totalRecords / limit);

        res.render('admin/reports/auctionDetailReport', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            title: 'Admin Auction Detail',
            property,
            bids,
            user: admin,
            userRole: 'admin',
            currentPage: 'reports',
            currentPaginationPage: page,
            totalPages,
            totalRecords,
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
        const skip = (page - 1) * limit;

        const { bidType, status, searchQuery, startDate, endDate } = req.query;

        let filter = {};
        let tenderFilter = {};

        if (status) {
            filter.bidStatus = status;
            tenderFilter.bidStatus = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            tenderFilter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
                tenderFilter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
                tenderFilter.createdAt.$lte = new Date(endDate);
            }
        }

        const [propertyBids, tenderBids] = await Promise.all([
            PropertyBid.find(filter)
                .populate('bidderId', 'name email')
                .populate({
                    path: 'propertyId',
                    select: 'title basePrice sellerId results',
                    populate: { path: 'sellerId', select: 'name email' }
                })
                .sort({ createdAt: -1 })
                .lean(),
            TenderBid.find(tenderFilter)
                .populate('vendorId', 'name email')
                .populate('tenderId', 'title')
                .sort({ createdAt: -1 })
                .lean()
        ]);

        const normalizedPropertyBids = propertyBids.map(bid => ({
            _id: bid._id,
            type: 'property',
            title: bid.propertyId?.title || 'N/A',
            amount: bid.amount,
            status: bid.bidStatus || 'active',
            date: bid.createdAt,
            isWinning: bid.isWinningBid,
            referenceId: bid.propertyId?._id,
            bidderName: bid.bidderId?.name || 'N/A',
            bidderEmail: bid.bidderId?.email || 'N/A',
            ownerName: bid.propertyId?.sellerId?.name || 'N/A',
            ownerEmail: bid.propertyId?.sellerId?.email || 'N/A',
        }));

        const normalizedTenderBids = tenderBids.map(bid => ({
            _id: bid._id,
            type: 'tender',
            title: bid.tenderId?.title || 'N/A',
            amount: bid.quotes?.amount || 0,
            status: bid.status || 'draft',
            date: bid.createdAt,
            isWinning: bid.isWinner,
            referenceId: bid.tenderId?._id,
            bidderName: bid.vendorId?.name || 'N/A',
            bidderEmail: bid.vendorId?.email || 'N/A',
            ownerName: 'Project Owner',
            ownerEmail: 'N/A',
        }));

        let allBids = [...normalizedPropertyBids, ...normalizedTenderBids];

        if (bidType && bidType !== 'all') {
            allBids = allBids.filter(b => b.type === bidType);
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            allBids = allBids.filter(b =>
                b.title.toLowerCase().includes(lowerQuery) ||
                b.bidderName.toLowerCase().includes(lowerQuery) ||
                b.bidderEmail.toLowerCase().includes(lowerQuery) ||
                String(b.amount).includes(lowerQuery)
            );
        }

        allBids.sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalRecords = allBids.length;
        const totalPages = Math.ceil(totalRecords / limit);
        const paginatedBids = allBids.slice(skip, skip + limit);

        const wonBids = allBids.filter(b => ['won', 'awarded', 'accepted'].includes(b.status)).length;
        const activeBids = allBids.filter(b => ['active', 'submitted', 'qualified'].includes(b.status)).length;
        const totalBids = allBids.length;
        const totalAmount = allBids.reduce((sum, b) => sum + (b.amount || 0), 0);

        const participationPayments = await Payment.find({
            type: 'participation_fee',
            status: 'success'
        }).lean();
        const totalRevenue = participationPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        const refundPayments = await Payment.find({
            $or: [
                { status: 'refunded' },
                { refundAmount: { $gt: 0 } }
            ]
        }).lean();
        const totalRefunds = refundPayments.reduce((sum, p) => sum + (p.refundAmount || p.amount || 0), 0);

        const stats = {
            totalBids,
            activeBids,
            wonBids,
            totalAmount,
            totalRevenue,
            totalRefunds
        };

        res.render('admin/reports/platformBidReports', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            bids: paginatedBids,
            stats,
            paginationData: {
                currentPage: page,
                totalPages,
                totalRecords,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages
            },
            queryParams: new URLSearchParams(req.query).toString() ? '&' + new URLSearchParams(req.query).toString() : '',
            currentPaginationPage: page,
            totalPages,
            totalRecords,
            limit,
            filters: { bidType, status, searchQuery, startDate, endDate },
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
        const skip = (page - 1) * limit;

        const { status, type, startDate, endDate, search } = req.query;
        let filter = {};

        if (status) filter.status = status;
        if (type) filter.type = type;

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        if (search) {
            filter.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { gatewayPaymentId: { $regex: search, $options: 'i' } }
            ];
        }

        const totalRecords = await Payment.countDocuments(filter);
        const payments = await Payment.find(filter)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalPages = Math.ceil(totalRecords / limit);

        const successful = await Payment.countDocuments({ ...filter, status: 'success' });
        const failed = await Payment.countDocuments({ ...filter, status: 'failed' });
        const refunded = await Payment.countDocuments({ ...filter, status: 'refunded' });

        const totalVolume = await Payment.aggregate([
            { $match: { ...filter, status: 'success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const volume = totalVolume[0]?.total || 0;

        res.render('admin/reports/paymentAudit', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            title: 'Payment Audit Report',
            payments,
            stats: { successful, failed, refunded, volume },
            paginationData: {
                currentPage: page,
                totalPages,
                totalRecords,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages
            },
            queryParams: new URLSearchParams(req.query).toString() ? '&' + new URLSearchParams(req.query).toString() : '',
            currentPaginationPage: page,
            totalPages,
            totalRecords,
            limit,
            filters: { status, type, startDate, endDate, search },
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
        const skip = (page - 1) * limit;
        const { status, searchQuery, startDate, endDate } = req.query;

        let query = {};
        if (status) query.status = status;
        if (searchQuery) query.title = { $regex: searchQuery, $options: 'i' };

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const totalRecords = await Tender.countDocuments(query);
        const tenders = await Tender.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('awardedTo', 'name email phone')
            .populate('createdBy', 'name email companyName')
            .lean();

        const tenderIds = tenders.map(t => t._id);

        const [allBids, allWinningBids, allWorkOrders, allAgreements] = await Promise.all([
            TenderBid.find({
                tenderId: { $in: tenderIds },
                status: { $ne: 'draft' },
            }).select('tenderId quotes.amount status'),

            TenderBid.find({
                tenderId: { $in: tenderIds },
                isWinner: true,
            }).populate('proposal.files quotes.files techForms.files finForms.files').lean(),

            require('../../models/workOrder').find({ tenderId: { $in: tenderIds } }).populate('pdfFile').lean(),
            require('../../models/agreement').find({ tenderId: { $in: tenderIds } }).populate('uploadedByVendor').lean()
        ]);

        const bidsMap = {};
        allBids.forEach(bid => {
            if (!bidsMap[bid.tenderId]) bidsMap[bid.tenderId] = [];
            bidsMap[bid.tenderId].push(bid);
        });

        const winnersMap = {};
        allWinningBids.forEach(bid => {
            winnersMap[bid.tenderId] = bid;
        });

        const workOrdersMap = {};
        allWorkOrders.forEach(wo => {
            workOrdersMap[wo.tenderId] = wo;
        });

        const agreementsMap = {};
        allAgreements.forEach(ag => {
            agreementsMap[ag.tenderId] = ag;
        });

        const tendersWithStats = tenders.map((tender) => {
            const bids = bidsMap[tender._id] || [];
            const validBids = bids.filter((b) => b.quotes && b.quotes.amount > 0);
            const bidAmounts = validBids.map((b) => b.quotes.amount);

            const stats = {
                totalBids: bids.length,
                minBid: bidAmounts.length ? Math.min(...bidAmounts) : 0,
                maxBid: bidAmounts.length ? Math.max(...bidAmounts) : 0,
                avgBid: bidAmounts.length ? bidAmounts.reduce((a, b) => a + b, 0) / bidAmounts.length : 0,
            };

            let winningBid = null;
            if (tender.awardedTo) {
                const winnerBid = winnersMap[tender._id];
                if (winnerBid) {
                    const documents = {};
                    const addFiles = (category, files) => {
                        if (files && files.length > 0) {
                            documents[category] = files;
                        }
                    };
                    addFiles('Proposal', winnerBid.proposal?.files);
                    addFiles('Technical Docs', winnerBid.techForms?.files);
                    addFiles('Financial Docs', winnerBid.finForms?.files);
                    addFiles('Quotes / BOQ', winnerBid.quotes?.files);

                    const workOrder = workOrdersMap[tender._id];
                    if (workOrder && workOrder.pdfFile) {
                        documents['Work Order'] = [workOrder.pdfFile];
                    }

                    const agreement = agreementsMap[tender._id];
                    if (agreement && agreement.uploadedByVendor) {
                        documents['Agreement'] = [agreement.uploadedByVendor];
                    }

                    winningBid = {
                        amount: winnerBid.quotes.amount,
                        documents,
                    };
                }
            }

            return {
                ...tender,
                stats,
                winningBid,
            };
        });

        const summaryStats = {
            totalTenders: totalRecords,
            activeTenders: await Tender.countDocuments({ ...query, status: 'published' }),
            completedTenders: await Tender.countDocuments({
                ...query,
                status: { $in: ['awarded', 'closed'] },
            }),
            totalVolume: tendersWithStats.reduce(
                (sum, t) => sum + (t.awardedTo ? t.stats.minBid || 0 : 0),
                0
            ),
        };

        res.render('admin/reports/tenderEvaluation', {
            layout: LAYOUTS.ADMIN_LAYOUT,
            title: 'Tender Evaluation Reports',
            tenders: tendersWithStats,
            stats: summaryStats,
            paginationData: {
                currentPage: page,
                totalPages: Math.ceil(totalRecords / limit),
                totalRecords,
                hasPrevPage: page > 1,
                hasNextPage: page < Math.ceil(totalRecords / limit)
            },
            queryParams: new URLSearchParams(req.query).toString() ? '&' + new URLSearchParams(req.query).toString() : '',
            currentPaginationPage: page,
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords,
            limit,
            filters: req.query,
            userRole: 'admin',
            user: admin,
            admin: admin,
            currentPage: 'reports',
        });

    } catch (error) {
        console.error('Admin Tender Evaluation Error:', error);
        res.status(500).render(VIEWS.ERROR, {
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
        res.status(500).json({ message: 'Failed to export PDF' });
    }
};

exports.downloadWorkOrderReport = async (req, res) => {
    try {
        const admin = req.admin;
        if (!admin) return res.status(401).send('Unauthorized');

        const { id } = req.params;
        const workOrder = await WorkOrder.findById(id).populate('pdfFile');

        if (!workOrder || !workOrder.pdfFile) {
            return res.status(404).send('Work Order Report not found');
        }

        res.redirect(workOrder.pdfFile.fileUrl);

    } catch (error) {
        res.status(500).send('Error downloading report');
    }
};

