const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const { LAYOUTS, ERROR_MESSAGES } = require('../../utils/constants');

exports.getTenderEvaluation = async (req, res) => {
  try {
    const userRole = req.admin ? 'admin' : req.user?.role || 'user';
    const userId = req.user?._id;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const { status, searchQuery, startDate, endDate } = req.query;
    let query = {};
    if (userRole === 'vendor') {
      const userBids = await TenderBid.find({ vendorId: userId }).select('tenderId');
      const participatedTenderIds = userBids.map((b) => b.tenderId);
      query.$or = [{ createdBy: userId }, { _id: { $in: participatedTenderIds } }];
    }
    if (status) {
      query.status = status;
    }
    if (searchQuery) {
      query.title = { $regex: searchQuery, $options: 'i' };
    }
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
    const tendersWithStats = await Promise.all(
      tenders.map(async (tender) => {
        const bids = await TenderBid.find({
          tenderId: tender._id,
          status: { $ne: 'draft' },
        }).select('quotes.amount status');
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
          const winnerBid = await TenderBid.findOne({
            tenderId: tender._id,
            isWinner: true,
          })
            .populate('proposal.files quotes.files techForms.files finForms.files')
            .lean();
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
            const WorkOrder = require('../../models/workOrder');
            const workOrder = await WorkOrder.findOne({ tenderId: tender._id })
              .populate('pdfFile')
              .lean();
            if (workOrder && workOrder.pdfFile) {
              documents['Work Order'] = [workOrder.pdfFile];
            }
            const Agreement = require('../../models/agreement');
            const agreement = await Agreement.findOne({ tenderId: tender._id })
              .populate('uploadedByVendor')
              .lean();
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
      })
    );
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
    const layout = LAYOUTS.USER_LAYOUT;
    res.render('user/tenderEvaluation', {
      title: 'Tender Evaluation Reports',
      tenders: tendersWithStats,
      stats: summaryStats,
      filters: req.query,
      userRole,
      layout,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        hasPrevPage: page > 1,
        hasNextPage: page < Math.ceil(totalRecords / limit),
      },
      queryParams: new URLSearchParams(req.query).toString()
        ? '&' + new URLSearchParams(req.query).toString()
        : '',
    });
  } catch (error) {
    console.error('Tender Evaluation Error:', error);
    res.status(500).render('error', {
      message: ERROR_MESSAGES.ERROR_FETCHING_TENDER_REPORTS,
      error,
    });
  }
};
exports.exportTenderEvaluationPDF = async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const userRole = req.admin ? 'admin' : req.user?.role || 'user';
    const userId = req.user?._id;
    const { status, searchQuery, startDate, endDate } = req.body;
    let query = {};
    if (userRole === 'vendor') {
      const userBids = await TenderBid.find({ vendorId: userId }).select('tenderId');
      const participatedTenderIds = userBids.map((b) => b.tenderId);
      query.$or = [{ createdBy: userId }, { _id: { $in: participatedTenderIds } }];
    }
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
    let totalVolume = 0;
    let activeCount = 0;
    let completedCount = 0;
    const tendersWithStats = await Promise.all(
      tenders.map(async (tender) => {
        const bids = await TenderBid.find({
          tenderId: tender._id,
          status: { $ne: 'draft' },
        }).select('quotes.amount status');
        const validBids = bids.filter((b) => b.quotes && b.quotes.amount > 0);
        const bidAmounts = validBids.map((b) => b.quotes.amount);
        if (tender.status === 'published') activeCount++;
        if (['awarded', 'closed'].includes(tender.status)) completedCount++;
        if (tender.awardedTo) totalVolume += bidAmounts.length ? Math.min(...bidAmounts) : 0;
        return {
          ...tender,
          totalBids: bids.length,
          minBid: bidAmounts.length ? Math.min(...bidAmounts) : 0,
          maxBid: bidAmounts.length ? Math.max(...bidAmounts) : 0,
          avgBid: bidAmounts.length ? bidAmounts.reduce((a, b) => a + b, 0) / bidAmounts.length : 0,
        };
      })
    );
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=tender-evaluation-report.pdf');
    doc.pipe(res);
    const colors = {
      primary: '#2563eb',
      secondary: '#1e40af',
      accent: '#3b82f6',
      gray: '#6b7280',
      lightGray: '#f3f4f6',
      white: '#ffffff',
      text: '#111827',
    };
    doc.rect(0, 0, 600, 100).fill(colors.primary);
    doc.fillColor(colors.white).fontSize(28).font('Helvetica-Bold').text('NexaBid', 40, 35);
    doc.fontSize(10).font('Helvetica').text('Tender Evaluation Report', 40, 70);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 400, 35, {
      align: 'right',
      width: 150,
    });
    doc.text(`User: ${req.user?.name || 'Admin'}`, 400, 50, { align: 'right', width: 150 });
    const startY = 120;
    const cardWidth = 120;
    const cardGap = 15;
    const cards = [
      { label: 'Total Tenders', value: tenders.length.toString() },
      { label: 'Active', value: activeCount.toString() },
      { label: 'Completed', value: completedCount.toString() },
      { label: 'Est. Volume', value: `₹${(totalVolume / 1000000).toFixed(1)}M` },
    ];
    let currentX = 40;
    cards.forEach((card) => {
      doc
        .roundedRect(currentX, startY, cardWidth, 60, 5)
        .fill(colors.lightGray)
        .stroke(colors.gray);
      doc
        .fillColor(colors.primary)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(card.value, currentX + 10, startY + 15);
      doc
        .fillColor(colors.gray)
        .fontSize(9)
        .font('Helvetica')
        .text(card.label, currentX + 10, startY + 40);
      currentX += cardWidth + cardGap;
    });
    const tableTop = 210;
    let y = tableTop;
    const colX = [30, 160, 240, 350, 410, 480];
    const colWidths = [120, 70, 100, 50, 60, 60];
    const rowHeight = 30;
    const drawHeader = (yPos) => {
      doc.rect(30, yPos - 5, 535, 25).fill(colors.primary);
      doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(9);
      doc.text('TENDER TITLE', colX[0], yPos + 2, { width: colWidths[0], ellipsis: true });
      doc.text('STATUS', colX[1], yPos + 2, { width: colWidths[1] });
      doc.text('WINNER', colX[2], yPos + 2, { width: colWidths[2] });
      doc.text('BIDS', colX[3], yPos + 2, { width: colWidths[3] });
      doc.text('LOWEST', colX[4], yPos + 2, { width: colWidths[4] });
      doc.text('HIGHEST', colX[5], yPos + 2, { width: colWidths[5] });
    };
    drawHeader(y);
    y += 30;
    tendersWithStats.forEach((t, i) => {
      if (y > 750) {
        doc.addPage();
        y = 50;
        drawHeader(y);
        y += 30;
      }
      if (i % 2 === 0) {
        doc.rect(30, y - 5, 535, rowHeight).fill(colors.lightGray);
      }
      doc.fillColor(colors.text).font('Helvetica').fontSize(9);
      doc.text(t.title, colX[0], y, { width: colWidths[0], ellipsis: true, lineBreak: false });
      let statusColor = colors.text;
      if (t.status === 'published') statusColor = '#eab308';
      else if (t.status === 'awarded') statusColor = '#16a34a';
      else if (t.status === 'cancelled') statusColor = '#dc2626';
      doc
        .fillColor(statusColor)
        .font('Helvetica-Bold')
        .text(t.status.toUpperCase(), colX[1], y, { width: colWidths[1], ellipsis: true });
      doc.fillColor(colors.text).font('Helvetica');
      doc.text(t.awardedTo?.name || '-', colX[2], y, {
        width: colWidths[2],
        ellipsis: true,
        lineBreak: false,
      });
      doc.text(t.totalBids.toString(), colX[3], y, { width: colWidths[3] });
      doc.text(t.minBid.toLocaleString(), colX[4], y, { width: colWidths[4] });
      doc.text(t.maxBid.toLocaleString(), colX[5], y, { width: colWidths[5] });
      y += rowHeight;
    });
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor(colors.gray)
        .text(`Page ${i + 1} of ${pages.count}`, 0, doc.page.height - 30, { align: 'center' });
    }
    doc.end();
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ message: ERROR_MESSAGES.FAILED_EXPORT_PDF });
  }
};
