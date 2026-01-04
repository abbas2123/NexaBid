const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ROOT_UPLOAD = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    let subFolder = '';

    if (file.fieldname === 'finForms') {
      subFolder = 'tender-finDocs';
      console.log('Uploading FIN docs →', subFolder);
    } else if (file.fieldname === 'quotationFiles') {
      subFolder = 'tender-quoteDocs';
      console.log('Uploading QUOTE docs →', subFolder);
    } else {
      subFolder = 'tender-other';
    }

    const uploadPath = path.join(ROOT_UPLOAD, subFolder);

    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },

  filename(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

const tenderUploads = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = tenderUploads;
