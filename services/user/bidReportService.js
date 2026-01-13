const PropertyBid = require('../../models/propertyBid');
const TenderBid = require('../../models/tenderBid');
const PDFDocument = require('pdfkit');


exports.getBidReportsData = async (userId, userRole, filters) => {
    const { bidType, status, searchQuery, startDate, endDate } = filters;

    let propertyQuery = {};
    if (userRole !== 'admin') {
        propertyQuery.bidderId = userId;
    }
    if (status && bidType !== 'tender') {
        propertyQuery.bidStatus = status;
    }
    if (startDate || endDate) {
        propertyQuery.createdAt = {};
        if (startDate) propertyQuery.createdAt.$gte = new Date(startDate);
        if (endDate) propertyQuery.createdAt.$lte = new Date(endDate);
    }

    let tenderQuery = {};
    if (userRole !== 'admin') {
        tenderQuery.vendorId = userId;
    }
    if (status && bidType !== 'property') {
        tenderQuery.status = status;
    }
    if (startDate || endDate) {
        tenderQuery.createdAt = {};
        if (startDate) tenderQuery.createdAt.$gte = new Date(startDate);
        if (endDate) tenderQuery.createdAt.$lte = new Date(endDate);
    }

    let propertyBids = [];
    let tenderBids = [];

    if (!bidType || bidType === 'all' || bidType === 'property') {
        propertyBids = await PropertyBid.find(propertyQuery)
            .populate({
                path: 'propertyId',
                select: 'title reservePrice auctionEndTime sellerId',
                populate: { path: 'sellerId', select: 'name email companyName' },
            })
            .populate('bidderId', 'name email')
            .sort({ createdAt: -1 })
            .lean();
    }

    if (!bidType || bidType === 'all' || bidType === 'tender') {
        tenderBids = await TenderBid.find(tenderQuery)
            .populate({
                path: 'tenderId',
                select: 'title estimatedValue closingDate createdBy',
                populate: { path: 'createdBy', select: 'name email companyName' },
            })
            .populate('vendorId', 'name email')
            .sort({ createdAt: -1 })
            .lean();
    }

    const allBids = [
        ...propertyBids.map((bid) => ({
            _id: bid._id,
            type: 'property',
            title: bid.propertyId?.title || 'N/A',
            amount: bid.amount,
            status: bid.bidStatus,
            date: bid.createdAt,
            isWinning: bid.isWinningBid,
            referenceId: bid.propertyId?._id,
            bidderName: bid.bidderId?.name || 'N/A',
            bidderEmail: bid.bidderId?.email || 'N/A',
        })),
        ...tenderBids.map((bid) => ({
            _id: bid._id,
            type: 'tender',
            title: bid.tenderId?.title || 'N/A',
            amount: bid.quotes?.amount || 0,
            status: bid.status,
            date: bid.createdAt,
            isWinning: bid.isWinner,
            referenceId: bid.tenderId?._id,
            bidderName: bid.vendorId?.name || 'N/A',
            bidderEmail: bid.vendorId?.email || 'N/A',
            ownerName: bid.tenderId?.createdBy?.name || 'N/A',
            ownerEmail: bid.tenderId?.createdBy?.email || 'N/A',
        })),
    ];

    let filteredBids = allBids;
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredBids = allBids.filter((bid) => bid.title.toLowerCase().includes(query));
    }

    filteredBids.sort((a, b) => new Date(b.date) - new Date(a.date));

    const stats = {
        totalBids: filteredBids.length,
        activeBids: filteredBids.filter(
            (b) => b.status === 'active' || b.status === 'submitted' || b.status === 'qualified'
        ).length,
        wonBids: filteredBids.filter((b) => b.status === 'won' || b.status === 'awarded').length,
        totalAmount: filteredBids.reduce((sum, b) => sum + (b.amount || 0), 0),
    };

    return { filteredBids, stats };
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

    // Header
    doc.rect(0, 0, 600, 100).fill(colors.primary);
    doc.fillColor(colors.white).fontSize(28).font('Helvetica-Bold').text('NexaBid', 40, 35);
    doc.fontSize(10).font('Helvetica').text('My Activity & Bid Report', 40, 70);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 400, 35, {
        align: 'right',
        width: 150,
    });
    doc.text(`User: ${currentUser.name || 'User'}`, 400, 50, { align: 'right', width: 150 });

    // Stats Cards
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

    // Table
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

        // Status Column
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

    // Pagination Info
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor(colors.gray).text(`Page ${i + 1} of ${pages.count}`, 0, doc.page.height - 30, { align: 'center' });
    }

    doc.end();
};
