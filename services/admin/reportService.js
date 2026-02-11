const Property = require('../../models/property');
const PropertyBid = require('../../models/propertyBid');
const TenderBid = require('../../models/tenderBid');
const Tender = require('../../models/tender');
const Payment = require('../../models/payment');
const WorkOrder = require('../../models/workOrder');


exports.getPropertyAuctionReportsData = async (page = 1, limit = 10) => {
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

    return {
        properties,
        pagination: {
            currentPage: page,
            totalPages,
            totalRecords,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages
        }
    };
};


exports.getWorkOrderReportsData = async (page = 1, limit = 10) => {
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

    return {
        workOrders,
        pagination: {
            currentPage: page,
            totalPages,
            totalRecords,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages
        }
    };
};


exports.getAuctionDetailReportData = async (propertyId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const property = await Property.findById(propertyId)
        .populate('currentHighestBidder', 'name email phone')
        .populate('sellerId', 'name email')
        .lean();

    if (!property) return null;

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
            totalRecords
        }
    };
};


exports.getAllBidReportsData = async (queryParams, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const { bidType, status, searchQuery, startDate, endDate } = queryParams;

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

    const wonBidsCount = allBids.filter(b => ['won', 'awarded', 'accepted'].includes(b.status)).length;
    const activeBidsCount = allBids.filter(b => ['active', 'submitted', 'qualified'].includes(b.status)).length;
    const totalAmount = allBids.reduce((sum, b) => sum + (b.amount || 0), 0);

    const [participationPayments, refundPayments] = await Promise.all([
        Payment.find({ type: 'participation_fee', status: 'success' }).lean(),
        Payment.find({ $or: [{ status: 'refunded' }, { refundAmount: { $gt: 0 } }] }).lean()
    ]);

    const totalRevenue = participationPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalRefunds = refundPayments.reduce((sum, p) => sum + (p.refundAmount || p.amount || 0), 0);

    return {
        bids: paginatedBids,
        stats: {
            totalBids: totalRecords,
            activeBids: activeBidsCount,
            wonBids: wonBidsCount,
            totalAmount,
            totalRevenue,
            totalRefunds
        },
        pagination: {
            currentPage: page,
            totalPages,
            totalRecords,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages
        }
    };
};


exports.getPaymentAuditReportData = async (queryParams, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const { status, type, startDate, endDate, search } = queryParams;
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

    const [successful, failed, refunded, totalVolumeResult] = await Promise.all([
        Payment.countDocuments({ ...filter, status: 'success' }),
        Payment.countDocuments({ ...filter, status: 'failed' }),
        Payment.countDocuments({ ...filter, status: 'refunded' }),
        Payment.aggregate([
            { $match: { ...filter, status: 'success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
    ]);

    const volume = totalVolumeResult[0]?.total || 0;

    return {
        payments,
        stats: { successful, failed, refunded, volume },
        pagination: {
            currentPage: page,
            totalPages,
            totalRecords,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages
        }
    };
};


exports.getTenderEvaluationData = async (queryParams, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const { status, searchQuery, startDate, endDate } = queryParams;

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

        WorkOrder.find({ tenderId: { $in: tenderIds } }).populate('pdfFile').lean(),
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

    return {
        tenders: tendersWithStats,
        stats: summaryStats,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalRecords / limit),
            totalRecords,
            hasPrevPage: page > 1,
            hasNextPage: page < Math.ceil(totalRecords / limit)
        }
    };
};

/**
 * Get Work Order Report File URL
 */
exports.getWorkOrderReportFileUrl = async (workOrderId) => {
    const workOrder = await WorkOrder.findById(workOrderId).populate('pdfFile');
    if (!workOrder || !workOrder.pdfFile) return null;
    return workOrder.pdfFile.fileUrl;
};
