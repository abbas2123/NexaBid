// middlewares/propertyUpload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ROOT_UPLOAD = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    let subFolder = "property-media";

    if (file.fieldname === "docs") {
      subFolder = "property-docs";
    }

    const uploadPath = path.join(ROOT_UPLOAD, subFolder);
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // you can restrict file types if you want
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

module.exports = upload;