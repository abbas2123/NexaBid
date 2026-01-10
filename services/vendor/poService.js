const PDFDocument = require('pdfkit');
const cloudinary = require('../../config/cloudinary');
const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const PO = require('../../models/purchaseOrder');
const File = require('../../models/File');
const generatePONumber = require('../../utils/poNumber');
const notificationService = require('../notificationService');
const { ERROR_MESSAGES } = require('../../utils/constants');


const uploadPDF = (buffer, filename) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({
        resource_type: 'raw',
        folder: 'post_award/po_pdfs',
        public_id: filename, // FIX: No extension for RAW resources signature match
        type: 'authenticated',
      }, (e, r) =>
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


  
const colors = {
  primary: '#1e3a8a', // Deep Blue
  secondary: '#0ea5e9', // Sky Blue
  accent: '#10b981', // Green
  danger: '#ef4444', // Red
  text: '#1f2937', // Dark Gray
  lightText: '#6b7280', // Medium Gray
  lightBg: '#f3f4f6', // Light Gray
  border: '#d1d5db', // Border Gray
  white: '#ffffff',
};
const doc = new PDFDocument({
  margin: 40,
  bufferPages: true,
});
const buffers = [];
doc.on('data', (d) => buffers.push(d));

 const pdfBuffer = await new Promise((resolve) => {
   doc.on('end', () => resolve(Buffer.concat(buffers)));

   // ============ HEADER SECTION ============
   // Background Rectangle for Header
   doc.rect(0, 0, doc.page.width, 100).fill(colors.primary);

   // Company Name / Title
   doc.fontSize(28).font('Helvetica-Bold').fillColor(colors.white).text('PURCHASE ORDER', 50, 20);

   // PO Number on Right Side
   doc
     .fontSize(12)
     .font('Helvetica')
     .fillColor(colors.secondary)
     .text(`PO #${poNumber}`, 50, 55, {
       align: 'right',
       width: doc.page.width - 100,
     });

   doc.moveDown(0.5);

   // ============ DIVIDER ============
   doc
     .strokeColor(colors.secondary)
     .lineWidth(2)
     .moveTo(40, doc.y)
     .lineTo(doc.page.width - 40, doc.y)
     .stroke();

   doc.moveDown(1);

   // ============ ORDER DETAILS SECTION ============
   doc
     .fontSize(11)
     .font('Helvetica-Bold')
     .fillColor(colors.primary)
     .text('ORDER DETAILS', { underline: true });

   doc.moveDown(0.4);

   // Create a table-like structure for order details
   const details = [
     { label: 'Tender Title', value: tender.title, width: 250 },
     { label: 'Vendor Name', value: vendor.name || vendor.companyName, width: 250 },
     { label: 'Contract Amount', value: `â‚¹${form.amount.toLocaleString('en-IN')}`, width: 250 },
     {
       label: 'Start Date',
       value: new Date(form.startDate).toLocaleDateString('en-IN'),
       width: 250,
     },
     { label: 'End Date', value: new Date(form.endDate).toLocaleDateString('en-IN'), width: 250 },
     { label: 'Issue Date', value: new Date().toLocaleDateString('en-IN'), width: 250 },
   ];

   const detailStartY = doc.y;
   const columnWidth = (doc.page.width - 80) / 2;

   details.forEach((detail, index) => {
     const row = Math.floor(index / 2);
     const col = index % 2;
     const x = 50 + col * (columnWidth + 20);
     const y = detailStartY + row * 45;

     // Background for each detail box
     doc.rect(x - 10, y - 5, columnWidth, 35).fillAndStroke(colors.lightBg, colors.border);

     // Label
     doc
       .fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(colors.lightText)
       .text(detail.label, x, y, { width: columnWidth - 10 });

     // Value
     doc
       .fontSize(11)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text(detail.value, x, y + 14, { width: columnWidth - 10 });
   });

   doc.y = detailStartY + 135;
   doc.moveDown(0.5);

   // ============ TERMS & CONDITIONS SECTION ============
   // Background for Terms Section
   doc.rect(40, doc.y, doc.page.width - 80, 1).fill(colors.secondary);

   doc.moveDown(0.5);

   doc
     .fontSize(11)
     .font('Helvetica-Bold')
     .fillColor(colors.primary)
     .text('TERMS & CONDITIONS', { underline: true });

   doc.moveDown(0.3);

   // Terms box with background
   const termsStartY = doc.y;
   const termsText = form.terms || 'No specific terms provided for this purchase order.';

   doc
     .rect(40, termsStartY - 5, doc.page.width - 80, 100)
     .fillAndStroke(colors.lightBg, colors.border);

   doc
     .fontSize(10)
     .font('Helvetica')
     .fillColor(colors.text)
     .text(termsText, 50, termsStartY + 5, {
       width: doc.page.width - 100,
       align: 'left',
     });

   doc.moveDown(8);

   // ============ IMPORTANT NOTES SECTION ============
   doc.moveDown(0.5);

   doc
     .fontSize(10)
     .font('Helvetica-Bold')
     .fillColor(colors.danger)
     .text('âš  IMPORTANT NOTES:', { underline: true });

   doc.moveDown(0.2);

   const notes = [
     'Payment must be completed within 30 days of invoice date.',
     'All deliverables must meet agreed quality standards.',
     'Delayed delivery may result in contract penalty.',
   ];

   notes.forEach((note) => {
     doc
       .fontSize(9)
       .font('Helvetica')
       .fillColor(colors.text)
       .text(`â€¢ ${note}`, 50, doc.y, { width: doc.page.width - 100 });
     doc.moveDown(0.25);
   });

   doc.moveDown(1);

   // ============ FOOTER SECTION ============
   const footerY = doc.page.height - 80;

   // Divider before footer
   doc
     .strokeColor(colors.secondary)
     .lineWidth(1)
     .moveTo(40, footerY)
     .lineTo(doc.page.width - 40, footerY)
     .stroke();

   // Footer content
   doc
     .fontSize(9)
     .font('Helvetica')
     .fillColor(colors.lightText)
     .text(
       'This is an electronically generated Purchase Order. No signature is required.',
       50,
       footerY + 10,
       {
         width: doc.page.width - 100,
         align: 'center',
       }
     );

   doc
     .fontSize(8)
     .fillColor(colors.lightText)
     .text(`Generated on: ${new Date().toLocaleString('en-IN')}`, {
       align: 'center',
     });

   doc.fontSize(8).fillColor(colors.lightText).text(`Tender ID: ${tenderId}`, {
     align: 'center',
   });

   doc.end();
 });


  const cld = await uploadPDF(pdfBuffer, poNumber);

  const pdfFileDoc = await File.create({
    ownerId: publisher._id,
    fileName: `${poNumber}.pdf`,
    originalName: `${poNumber}.pdf`,
    fileUrl: cld.secure_url,
    mimeType: 'application/pdf',
    size: pdfBuffer.length,
    version: cld.version,
    metadata: {
      public_id: cld.public_id,
      resource_type: cld.resource_type,
      type: cld.type,
      version: cld.version
    },
  });
  await PO.updateMany(
    { tenderId, status: { $in: ['vendor_rejected', 'generated'] } },
    { $set: { status: 'archived' } }
  );

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
  // DEBUG: Check all POs for this tender
  const allPos = await PO.find({ tenderId }).select('poNumber status createdAt pdfFile');
  console.log(`[PO Debug] Found ${allPos.length} POs for tender ${tenderId}:`);
  allPos.forEach(p => console.log(` - ID: ${p._id}, Status: ${p.status}, Created: ${p.createdAt}, PO#: ${p.poNumber}`));

  // Force fetch latest PO regardless of status to fix persistence of old files
  const po = await PO.findOne({ tenderId })
    .sort({ createdAt: -1 })
    .populate('vendorId')
    .populate('pdfFile');

  if (po) console.log(`[PO Debug] Selected PO: ${po.poNumber}, FileID: ${po.pdfFile?._id}`);

  if (!po) throw new Error(ERROR_MESSAGES.PO_NOT_FOUND);

  const tender = await Tender.findById(tenderId);
  if (!tender) throw new Error(ERROR_MESSAGES.TENDER_NOT_FOUND);

  return { po, tender };
};
