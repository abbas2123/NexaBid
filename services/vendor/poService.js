const PDFDocument = require('pdfkit');
const cloudinary = require('../../config/cloudinary');
const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const PO = require('../../models/purchaseOrder');
const File = require('../../models/File');
const generatePONumber = require('../../utils/poNumber');
const notificationService = require('../notificationService');
const { ERROR_MESSAGES } = require('../../utils/constants');

// upload helper
const uploadPDF = (buffer) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ resource_type: 'raw', folder: 'post_award/po_pdfs' }, (e, r) =>
        e ? reject(e) : resolve(r)
      )
      .end(buffer);
  });

exports.createPO = async ({ tenderId, publisher, form, io }) => {
  const tender = await Tender.findById(tenderId);
  if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);

  const winnerBid = await TenderBid.findOne({ tenderId, isWinner: true }).populate('vendorId');
  if (!winnerBid) throw new Error(ERROR_MESSAGES.WINNER_NOT_FOUND);

  const vendor = winnerBid.vendorId;
  const poNumber = generatePONumber();

  // Generate PDF buffer
  const doc = new PDFDocument();
  const buffers = [];
  doc.on('data', (d) => buffers.push(d));

  const pdfBuffer = await new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.fontSize(22).text('PURCHASE ORDER', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`PO NUMBER: ${poNumber}`);
    doc.text(`Tender: ${tender.title}`);
    doc.text(`Contract Amount: ₹${form.amount}`);
    doc.text(`Start Date: ${form.startDate}`);
    doc.text(`End Date: ${form.endDate}`);
    doc.moveDown();
    doc.text('Terms:');
    doc.text(form.terms || 'No terms provided.');
    doc.end();
  });

  // Upload to Cloudinary
  const cld = await uploadPDF(pdfBuffer);

  // Save file
  const pdfFileDoc = await File.create({
    ownerId: publisher._id,
    fileName: `${poNumber}.pdf`,
    originalName: `${poNumber}.pdf`,
    fileUrl: cld.secure_url,
    mimeType: 'application/pdf',
    size: pdfBuffer.length,
    metadata: { public_id: cld.public_id },
  });
  await PO.updateMany(
    { tenderId, status: { $in: ['vendor_rejected', 'generated'] } },
    { $set: { status: 'archived' } }
  );
  // Save PO
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
  });

  // Notify vendor
  if (io) {
    io.to(vendor._id.toString()).emit('newNotification', {
      title: 'Purchase Order Generated',
      message: `PO ${poNumber} generated for tender ${tender.title}`,
      tenderId,
    });
  }

  await notificationService.sendNotification(
    vendor._id,
    `PO ${poNumber} generated for tender "${tender.title}"`,
    cld.secure_url,
    io
  );

  return po;
};

exports.getPOData = async (tenderId) => {
  const po = await PO.findOne({ tenderId }).populate('vendorId').populate('pdfFile');
  if (!po) throw new Error(ERROR_MESSAGES.PO_NOT_FOUND);

  const tender = await Tender.findById(tenderId);
  if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);

  return { po, tender };
};
