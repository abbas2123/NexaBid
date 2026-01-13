const PDFDocument = require('pdfkit');
const cloudinary = require('../../config/cloudinary');
const uploadPDF = (buffer) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ resource_type: 'raw', folder: 'post_award/work_orders' }, (e, r) =>
        e ? reject(e) : resolve(r)
      )
      .end(buffer);
  });
module.exports = async ({ tender, vendor, body, woNumber }) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const buffers = [];
  doc.on('data', (d) => buffers.push(d));
  const pdfBuffer = await new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc
      .fillColor('#444444')
      .fontSize(20)
      .text('NexaBid', 50, 50, { align: 'left' })
      .fontSize(10)
      .text('Work Order Document', 200, 57, { align: 'right' })
      .moveDown();
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, 80).lineTo(550, 80).stroke();
    doc
      .fontSize(24)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('WORK ORDER', 50, 110, { align: 'center' });
    doc.moveDown();
    const startY = 160;
    doc
      .fillColor('#666666')
      .fontSize(10)
      .font('Helvetica')
      .text(`WO Number:`, 50, startY)
      .font('Helvetica-Bold')
      .text(woNumber, 120, startY)
      .font('Helvetica')
      .text(`Date Issued:`, 350, startY)
      .font('Helvetica-Bold')
      .text(new Date().toLocaleDateString('en-IN'), 430, startY);
    doc.moveDown();
    const colY = 200;
    doc.font('Helvetica-Bold').fontSize(12).text('Vendor Details', 50, colY);
    doc.rect(50, colY + 15, 230, 2).fill('#eeeeee');
    doc.fillColor('#000000').font('Helvetica').fontSize(10);
    doc.text(vendor.name, 50, colY + 30);
    doc.text(vendor.email, 50, colY + 45);
    doc.font('Helvetica-Bold').fontSize(12).text('Project Details', 320, colY);
    doc.rect(320, colY + 15, 230, 2).fill('#eeeeee');
    doc.fillColor('#000000').font('Helvetica').fontSize(10);
    doc.text(`Tender: ${tender.title}`, 320, colY + 30, { width: 230 });
    doc.text(`Value: ₹${Number(body.value).toLocaleString('en-IN')}`, 320, colY + 50);
    doc.text(`Duration: ${body.startDate} to ${body.completionDate}`, 320, colY + 65);
    const scopeY = Math.max(doc.y, 320);
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text('Scope of Work', 50, scopeY);
    doc.rect(50, scopeY + 18, 500, 2).fill('#333333');
    doc.moveDown(0.8);
    doc
      .font('Helvetica')
      .fontSize(11)
      .text(body.description || '—', {
        align: 'justify',
        width: 500,
        lineGap: 4,
      });
    if (body.milestones && body.milestones.length > 0) {
      doc.moveDown(2);
      const tableTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(12).text('Milestones & Schedule', 50, tableTop);
      doc.moveDown(0.5);
      const headerY = doc.y;
      doc.rect(50, headerY, 500, 25).fill('#f3f4f6');
      doc.fillColor('#333333').fontSize(10);
      doc.text('#', 60, headerY + 7);
      doc.text('Description', 100, headerY + 7);
      doc.text('Due Date', 450, headerY + 7);
      let rowY = headerY + 30;
      body.milestones.forEach((m, i) => {
        doc.fillColor('#000000').font('Helvetica').fontSize(10);
        doc.text(i + 1, 60, rowY);
        doc.text(m.description, 100, rowY, { width: 340 });
        doc.text(m.dueDate, 450, rowY);
        const rowHeight = doc.heightOfString(m.description, { width: 340 }) + 10;
        doc.rect(50, rowY + rowHeight, 500, 1).fill('#e5e7eb');
        rowY += rowHeight + 10;
      });
    }
    const bottomY = 750;
    doc
      .fontSize(10)
      .fillColor('#888888')
      .text('Authorized by NexaBid', 50, bottomY, { align: 'center', width: 500 });
    doc.end();
  });
  return await uploadPDF(pdfBuffer);
};
