// middlewares/tenderUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Root uploads folder
const ROOT_UPLOAD = path.join(__dirname, '..', 'uploads');
console.log('jncwjwjc');
console.log('dfffvfev', ROOT_UPLOAD);
const storage = multer.diskStorage({
  destination(req, file, cb) {
    let subFolder = '';

    // choose sub-folder based on fieldname
    if (file.fieldname === 'proposalFiles') {
      subFolder = 'tender-proposalDocs';
      console.log(subFolder);
    } else if (file.fieldname === 'techFiles') {
      subFolder = 'tender-techDocs';
      console.log(subFolder);
    } else {
      subFolder = 'tender-other';
    }

    const uploadPath = path.join(ROOT_UPLOAD, subFolder);

    // ensure folder exists
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },

  filename(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

const fileFilter = (req, file, cb) => {
  // optional: restrict file types
  cb(null, true);
};

const tenderUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

module.exports = tenderUpload;
