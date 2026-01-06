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
  const doc = new PDFDocument();
  const buffers = [];
  doc.on('data', (d) => buffers.push(d));

  const pdfBuffer = await new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.fontSize(22).text('WORK ORDER', { align: 'center' });
    doc.moveDown();
    doc.text(`WO Number: ${woNumber}`);
    doc.text(`Tender: ${tender.title}`);
    doc.text(`Vendor: ${vendor.name}`);
    doc.text(`Start Date: ${body.startDate}`);
    doc.text(`Completion Date: ${body.completionDate}`);
    doc.text(`Value: ₹${body.value}`);
    doc.moveDown();
    doc.text('Scope of Work:');
    doc.text(body.description || '—');
    doc.end();
  });

  return await uploadPDF(pdfBuffer);
};
