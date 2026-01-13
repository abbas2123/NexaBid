const postAwardService = require('../../services/vendor/postAward');
const statusCode = require('../../utils/statusCode');
const PDFDocument = require('pdfkit');
const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');
exports.viewWorkOrder = async (req, res) => {
  try {
    const fileUrl = await postAwardService.getWorkOrderFilePath(req.params.fileId);
    return res.redirect(fileUrl);
  } catch (err) {
    console.error('View work order error:', err.message);
    res.status(statusCode.NOT_FOUND).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.WORK_ORDER_NOT_FOUND,
      user: req.user,
    });
  }
};
exports.trackingPage = async (req, res) => {
  const workOrder = await postAwardService.getTrackingData(req.params.workOrderId);
  if (workOrder.redirectToPostAward) return res.redirect('/auth/dashboard');
  if (workOrder.status === 'completed') {
    return res.redirect(`/publisher/work-order/completed/completion-${workOrder._id}`);
  }
  res.render(VIEWS.WORK_ORDER_TRACKING, {
    layout: LAYOUTS.USER_LAYOUT,
    workOrder,
    user: req.user,
  });
};
exports.addNote = async (req, res) => {
  const { workOrderId } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ success: false, message: ERROR_MESSAGES.NOTE_EMPTY });
  await postAwardService.addNote(workOrderId, req.user._id, content);
  res.json({ success: true });
};
exports.reviewMilestone = async (req, res) => {
  await postAwardService.reviewMilestone(
    req.params.id,
    req.params.mid,
    req.body.action,
    req.body.comment
  );
  res.json({ success: true });
};
exports.approveProof = async (req, res) => {
  await postAwardService.approveProof(req.params.workOrderId, req.params.pid);
  res.json({ success: true });
};
exports.rejectProof = async (req, res) => {
  await postAwardService.rejectProof(req.params.workOrderId, req.params.pid, req.body.reason);
  res.json({ success: true });
};
exports.completeWorkOrder = async (req, res) => {
  const result = await postAwardService.completeWorkOrder(req.params.workOrderId);
  res.json({ success: true, workOrder: result.wo });
};
exports.workOrderCompletionPage = async (req, res) => {
  console.log('[DEBUG] workOrderCompletionPage hit. Params:', req.params);
  try {
    const data = await postAwardService.getCompletionSummary(req.params.id);
    console.log('[DEBUG] getCompletionSummary success. Data keys:', Object.keys(data));
    console.log('data', data);
    res.render(VIEWS.WORK_ORDER_COMPLETED, {
      layout: LAYOUTS.USER_LAYOUT,
      ...data,
      user: req.user,
    });
  } catch (err) {
    console.error('[DEBUG] workOrderCompletionPage error:', err);
    res.redirect('/auth/dashboard');
  }
};
exports.downloadReport = async (req, res) => {
  try {
    const { workOrderId } = req.params;
    const data = await postAwardService.getCompletionSummary(workOrderId);
    const { workOrder } = data;
    if (workOrder.completionReport && workOrder.completionReport.fileUrl) {
      return res.redirect(workOrder.completionReport.fileUrl);
    }
    console.log('data', data);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);
        const fileUrl = await postAwardService.saveCompletionReport(workOrder._id, pdfBuffer);
        return res.redirect(fileUrl);
      } catch (uploadError) {
        console.error('Error saving report:', uploadError);
        return res.status(500).send(ERROR_MESSAGES.FAILED_TO_SAVE_REPORT);
      }
    });
    const PRIMARY_COLOR = '#16a34a';
    const TEXT_DARK = '#111827';
    const TEXT_LIGHT = '#6b7280';
    const BORDER_COLOR = '#e5e7eb';
    doc.rect(0, 0, doc.page.width, 100).fill(PRIMARY_COLOR);
    doc.fillColor('white').fontSize(28).font('Helvetica-Bold').text('NexaBid', 50, 30);
    doc.fontSize(16).font('Helvetica').text('Work Order Completion Report', 50, 65);
    doc.fillColor(TEXT_DARK).fontSize(10).text('', 50, 130);
    const leftX = 50;
    const rightX = 300;
    const startY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold').text('Work Order Details', leftX, startY);
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor(TEXT_LIGHT).text('WO Number:');
    doc.fillColor(TEXT_DARK).text(workOrder.woNumber);
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor(TEXT_LIGHT).text('Completion Date:');
    doc
      .fillColor(TEXT_DARK)
      .text(new Date(workOrder.completedAt).toLocaleDateString('en-IN', { dateStyle: 'long' }));
    doc.fontSize(10).font('Helvetica-Bold').text('Project & Vendor', rightX, startY);
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor(TEXT_LIGHT).text('Project Title:', rightX);
    doc.fillColor(TEXT_DARK).text(workOrder.tenderId.title, rightX, doc.y, { width: 250 });
    doc.moveDown(0.5);
    doc.font('Helvetica').fillColor(TEXT_LIGHT).text('Vendor Name:', rightX);
    doc.fillColor(TEXT_DARK).text(workOrder.vendorName, rightX);
    doc.moveDown(3);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(1).strokeColor(BORDER_COLOR).stroke();
    doc.moveDown(2);
    doc
      .fillColor(PRIMARY_COLOR)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Project Status Summary', 50, doc.y);
    doc.moveDown(0.5);
    doc
      .fillColor(TEXT_DARK)
      .fontSize(11)
      .font('Helvetica')
      .text(
        'This document confirms that all scheduled milestones for the aforementioned Work Order have been successfully executed and approved. The project is officially marked as complete.',
        { align: 'justify', width: 500 }
      );
    doc.moveDown(1);
    const badgeY = doc.y;
    doc.roundedRect(50, badgeY, 100, 25, 5).fill('#dcfce7');
    doc
      .fillColor('#166534')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('COMPLETED', 50, badgeY + 8, { width: 100, align: 'center' });
    doc.y = badgeY + 40;
    doc.fillColor(PRIMARY_COLOR).fontSize(14).text('Milestone Execution Log', 50, doc.y);
    doc.moveDown(1);
    const tableTop = doc.y;
    doc.rect(50, tableTop, 500, 20).fill('#f9fafb');
    doc.fillColor(TEXT_DARK).fontSize(9).font('Helvetica-Bold');
    doc.text('#', 60, tableTop + 6);
    doc.text('Milestone Description', 90, tableTop + 6);
    doc.text('Completion Date', 400, tableTop + 6);
    doc.text('Status', 500, tableTop + 6);
    let yPosition = tableTop + 30;
    workOrder.milestones.forEach((m, i) => {
      if (yPosition > 750) {
        doc.addPage();
        yPosition = 50;
      }
      const dateStr = new Date(m.completedAt || m.updatedAt || Date.now()).toLocaleDateString();
      doc.fillColor(TEXT_DARK).fontSize(10).font('Helvetica');
      doc.text((i + 1).toString(), 60, yPosition);
      doc.text(m.description || m.name, 90, yPosition, { width: 300 });
      doc.text(dateStr, 400, yPosition);
      doc.fillColor(PRIMARY_COLOR).text('Approved', 500, yPosition);
      yPosition += 25;
      doc
        .moveTo(50, yPosition - 5)
        .lineTo(550, yPosition - 5)
        .lineWidth(0.5)
        .strokeColor(BORDER_COLOR)
        .stroke();
    });
    const bottomY = doc.page.height - 50;
    doc
      .fontSize(8)
      .fillColor(TEXT_LIGHT)
      .text(`Generated by NexaBid System | ${new Date().toLocaleString()}`, 50, bottomY, {
        align: 'center',
      });
    doc.end();
  } catch (err) {
    console.error('Download report error:', err);
    res.status(500).json({ message: ERROR_MESSAGES.FAILED_EXPORT_PDF });
  }
};
