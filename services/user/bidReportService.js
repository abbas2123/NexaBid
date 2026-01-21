const PropertyBid = require('../../models/propertyBid');
const PDFDocument = require('pdfkit');


exports.getBidReportsData = async (userId, userRole, filters, page = 1, limit = 1000000) => {
    const { bidType, status, searchQuery, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    // 1. Build Property Query
    const propertyMatch = {};
    if (userRole !== 'admin') propertyMatch.bidderId = userId;
    if (status && bidType !== 'tender') propertyMatch.bidStatus = status;
    if (startDate || endDate) {
        propertyMatch.createdAt = {};
        if (startDate) propertyMatch.createdAt.$gte = new Date(startDate);
        if (endDate) propertyMatch.createdAt.$lte = new Date(endDate);
    }

    // 2. Build Tender Query
    const tenderMatch = {};
    if (userRole !== 'admin') tenderMatch.vendorId = userId;
    if (status && bidType !== 'property') tenderMatch.status = status;
    if (startDate || endDate) {
        tenderMatch.createdAt = {};
        if (startDate) tenderMatch.createdAt.$gte = new Date(startDate);
        if (endDate) tenderMatch.createdAt.$lte = new Date(endDate);
    }

    const pipeline = [];

    // 3. Initial Stage: Property Bids
    if (!bidType || bidType === 'all' || bidType === 'property') {
        pipeline.push({ $match: propertyMatch });
        pipeline.push({
            $project: {
                _id: 1,
                type: { $literal: 'property' },
                amount: 1,
                status: '$bidStatus',
                date: '$createdAt',
                refId: '$propertyId',
                userId: '$bidderId'
            }
        });
    } else {
        // If query is ONLY tenders, start with empty match on properties to effectively skip them? 
        // No, cleaner to start aggregation on TenderBid if ONLY tender.
        // But for uniform pipeline with $unionWith, we can start with a dummy match resulting in 0 docs from PropertyBid.
        pipeline.push({ $match: { _id: null } });
    }

    // 4. Union Stage: Tender Bids
    if (!bidType || bidType === 'all' || bidType === 'tender') {
        pipeline.push({
            $unionWith: {
                coll: 'tenderbids',
                pipeline: [
                    { $match: tenderMatch },
                    {
                        $project: {
                            _id: 1,
                            type: { $literal: 'tender' },
                            amount: '$quotes.amount',
                            status: '$status',
                            date: '$createdAt',
                            refId: '$tenderId',
                            userId: '$vendorId'
                        }
                    }
                ]
            }
        });
    }

    // 5. Lookups for Details (Property/Tender/User)
    pipeline.push(
        {
            $lookup: {
                from: 'properties',
                localField: 'refId',
                foreignField: '_id',
                as: 'property'
            }
        },
        {
            $lookup: {
                from: 'tenders',
                localField: 'refId',
                foreignField: '_id',
                as: 'tender'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $addFields: {
                title: {
                    $cond: {
                        if: { $eq: ['$type', 'property'] },
                        then: { $arrayElemAt: ['$property.title', 0] },
                        else: { $arrayElemAt: ['$tender.title', 0] }
                    }
                },
                bidderName: { $arrayElemAt: ['$user.name', 0] },
                bidderEmail: { $arrayElemAt: ['$user.email', 0] },
                isWinning: {
                    // Logic for winning varies
                    // For property: isWinningBid (missing in project stage? need to check Model)
                    // PropertyBid schema has 'isWinningBid' ? No, it has `currentHighestBidder` on Property. 
                    // Wait, the original code used `isWinningBid` but PropertyBid model (viewed earlier) doesn't explicitly show it.
                    // Ah, PropertyBid has `status: 'won'`. And `currentHighestBidder`.
                    // Let's rely on status.
                    $or: [
                        { $eq: ['$status', 'won'] },
                        { $eq: ['$status', 'awarded'] }
                    ]
                }
            }
        }
    );

    // 6. Search Filter
    if (searchQuery) {
        pipeline.push({
            $match: {
                title: { $regex: searchQuery, $options: 'i' }
            }
        });
    }

    // 7. Facet for Data and Stats
    pipeline.push(
        { $sort: { date: -1 } },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: skip }, { $limit: limit }],
                stats: [
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: '$amount' },
                            activeCount: {
                                $sum: {
                                    $cond: [{ $in: ['$status', ['active', 'submitted', 'qualified']] }, 1, 0]
                                }
                            },
                            wonCount: {
                                $sum: {
                                    $cond: [{ $in: ['$status', ['won', 'awarded']] }, 1, 0]
                                }
                            }
                        }
                    }
                ]
            }
        }
    );

    const results = await PropertyBid.aggregate(pipeline);
    const result = results[0];

    const totalRecords = result.metadata[0]?.total || 0;
    const bids = result.data || [];
    const statsData = result.stats[0] || { totalAmount: 0, activeCount: 0, wonCount: 0 };

    return {
        bids, // Renamed from filteredBids to bids for clarity, controller updated to expect `bids`
        stats: {
            totalBids: totalRecords,
            activeBids: statsData.activeCount,
            wonBids: statsData.wonCount,
            totalAmount: statsData.totalAmount
        },
        totalRecords
    };
};


exports.generateBidReportPDF = async (res, currentUser, userRole, filters) => {
    const { filteredBids, stats } = await exports.getBidReportsData(currentUser._id, userRole, filters);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=my-bids-report.pdf');
    doc.pipe(res);

    const colors = {
        primary: '#2563eb',
        secondary: '#1e40af',
        gray: '#6b7280',
        lightGray: '#f3f4f6',
        white: '#ffffff',
        text: '#111827',
    };

    doc.rect(0, 0, 600, 100).fill(colors.primary);
    doc.fillColor(colors.white).fontSize(28).font('Helvetica-Bold').text('NexaBid', 40, 35);
    doc.fontSize(10).font('Helvetica').text('My Activity & Bid Report', 40, 70);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 400, 35, {
        align: 'right',
        width: 150,
    });
    doc.text(`User: ${currentUser.name || 'User'}`, 400, 50, { align: 'right', width: 150 });

    const startY = 120;
    const cardWidth = 120;
    const cardGap = 15;
    const cards = [
        { label: 'Total Bids', value: stats.totalBids.toString() },
        { label: 'Won / Awarded', value: stats.wonBids.toString() },
        { label: 'Active', value: stats.activeBids.toString() },
        { label: 'Total Value', value: `₹${(stats.totalAmount / 1000).toFixed(1)}k` },
    ];

    let currentX = 40;
    cards.forEach((card) => {
        doc.roundedRect(currentX, startY, cardWidth, 60, 5).fill(colors.lightGray);
        doc.fillColor(colors.primary).fontSize(18).font('Helvetica-Bold').text(card.value, currentX + 10, startY + 15);
        doc.fillColor(colors.gray).fontSize(9).font('Helvetica').text(card.label, currentX + 10, startY + 40);
        currentX += cardWidth + cardGap;
    });

    const tableTop = 210;
    let y = tableTop;
    const colX = [30, 90, 230, 310, 390, 480];
    const colWidths = [50, 130, 70, 70, 80, 70];
    const rowHeight = 30;

    const drawHeader = (yPos) => {
        doc.rect(30, yPos - 5, 535, 25).fill(colors.primary);
        doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(9);
        doc.text('TYPE', colX[0], yPos + 2, { width: colWidths[0] });
        doc.text('TITLE', colX[1], yPos + 2, { width: colWidths[1], ellipsis: true });
        doc.text('AMOUNT', colX[2], yPos + 2, { width: colWidths[2] });
        doc.text('STATUS', colX[3], yPos + 2, { width: colWidths[3] });
        doc.text('DATE', colX[4], yPos + 2, { width: colWidths[4] });
        if (userRole === 'admin') doc.text('BIDDER', colX[5], yPos + 2, { width: colWidths[5], ellipsis: true });
    };

    drawHeader(y);
    y += 30;

    filteredBids.forEach((b, i) => {
        if (y > 750) {
            doc.addPage();
            y = 50;
            drawHeader(y);
            y += 30;
        }
        if (i % 2 === 0) doc.rect(30, y - 5, 535, rowHeight).fill(colors.lightGray);
        doc.fillColor(colors.text).font('Helvetica').fontSize(9);
        doc.text(b.type.charAt(0).toUpperCase() + b.type.slice(1), colX[0], y, { width: colWidths[0] });
        doc.text(b.title, colX[1], y, { width: colWidths[1], ellipsis: true, lineBreak: false });
        doc.text(`₹${(b.amount || 0).toLocaleString()}`, colX[2], y, { width: colWidths[2] });

        let statusColor = colors.text;
        const s = b.status.toLowerCase();
        if (['won', 'awarded'].includes(s)) statusColor = '#16a34a';
        else if (['rejected', 'outbid', 'cancelled'].includes(s)) statusColor = '#dc2626';
        else if (['active', 'submitted', 'qualified'].includes(s)) statusColor = '#eab308';

        doc.fillColor(statusColor).font('Helvetica-Bold').text(b.status.toUpperCase(), colX[3], y, {
            width: colWidths[3],
            ellipsis: true,
            lineBreak: false,
        });

        doc.fillColor(colors.text).font('Helvetica');
        doc.text(new Date(b.date).toLocaleDateString('en-IN'), colX[4], y, { width: colWidths[4] });
        if (userRole === 'admin') doc.text(b.bidderName, colX[5], y, { width: colWidths[5], ellipsis: true, lineBreak: false });
        y += rowHeight;
    });

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor(colors.gray).text(`Page ${i + 1} of ${pages.count}`, 0, doc.page.height - 30, { align: 'center' });
    }

    doc.end();
};
