const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ROOT_FOLDER = path.join(__dirname, "..", "uploads/agreement");
console.log('jjvjwvvweve')
const storage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(ROOT_FOLDER, { recursive: true });
    cb(null, ROOT_FOLDER);
  },
  filename(req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

module.exports = multer({ storage });