const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const PO = require('../../models/purchaseOrder');
const File = require('../../models/File');
const generatePONumber = require('../../utils/poNumber');
const notificationService = require('../notificationService');
const { ERROR_MESSAGES } = require('../../utils/constants');

const PDF_DIR = path.join(__dirname, '../../uploads/poPDF');

if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

exports.createPO = async ({ tenderId, publisher, form, io }) => {
  const tender = await Tender.findById(tenderId);
  if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);
  const oldPO = await PO.findOne({
    tenderId,
    status: 'vendor_rejected',
  });

  if (oldPO && oldPO.status === 'vendor_accepted') {
    throw new Error(ERROR_MESSAGES.PO_ALREADY_ACCEPTED);
  }

  if (oldPO && oldPO.status === 'vendor_rejected') {
    await PO.updateOne({ _id: oldPO._id }, { $set: { status: 'sent' } });
  }

  const winnerBid = await TenderBid.findOne({
    tenderId,
    isWinner: true,
  }).populate('vendorId');

  if (!winnerBid) throw new Error(ERROR_MESSAGES.WINNER_NOT_FOUND);

  const vendor = winnerBid.vendorId;

  const poNumber = generatePONumber();

  const pdfPath = path.join(PDF_DIR, `${poNumber}.pdf`);
  const doc = new PDFDocument();
  const pdfStream = fs.createWriteStream(pdfPath);
  doc.pipe(pdfStream);

  doc.fontSize(22).text('PURCHASE ORDER', { align: 'center' });

  doc.fontSize(12).text(`PO NUMBER: ${poNumber}`);
  doc.text(`Tender: ${tender.title}`);
  doc.moveDown();

  doc.text(`Contract Amount: ₹${form.amount}`);
  doc.text(`Start Date: ${form.startDate}`);
  doc.text(`End Date: ${form.endDate}`);
  doc.moveDown();

  doc.text('Terms:');
  doc.text(form.terms || 'No terms provided.');

  doc.end();

  await new Promise((resolve, reject) => {
    pdfStream.on('finish', resolve);
    pdfStream.on('error', reject);
  });

  const pdfFileDoc = await File.create({
    fileName: `${poNumber}.pdf`,
    originalName: `${poNumber}.pdf`,
    fileUrl: `/uploads/poPDF/${poNumber}.pdf`,
    uploadedBy: publisher._id,
  });

  const po = await PO.create({
    tenderId,
    vendorId: vendor._id,
    generatedBy: publisher._id,
    poNumber,
    amount: form.amount,
    startDate: form.startDate,
    endDate: form.endDate,
    terms: form.terms,
    pdfFile: pdfFileDoc._id,
    status: 'generated',
    rejectionReason: null,
    vendorRemarks: null,
    vendorResponseDate: null,
  });

  if (io) {
    io.to(vendor._id.toString()).emit('newNotification', {
      title: 'Purchase Order Generated',
      message: `PO ${poNumber} has been generated for tender ${tender.title}`,
      tenderId,
    });
  }

  await notificationService.sendNotification(
    vendor._id,
    `PO ${poNumber} generated for tender "${tender.title}"`,
    pdfFileDoc.fileUrl,
    io
  );

  return { po, tender };
};

exports.getPOData = async (tenderId) => {
  const po = await PO.findOne({ tenderId }).populate('vendorId').populate('pdfFile');

  if (!po) throw new Error(ERROR_MESSAGES.PO_NOT_FOUND);

  const tender = await Tender.findById(tenderId);
  if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);

  return { po, tender };
};
