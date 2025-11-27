const multer = require('multer');
const path = require('path');
const fs = require('fs');


const uploadDir = path.join(__dirname, ".." , "uploads" , "vendor-docs");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];

const storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null,uploadDir);
    },
    filename: (req,file,cb)=>{
        const unique = new Date()+ "-" + Math.round(Math.random()*1e9);
        cb(null,unique + path.extname(file.originalname));
    }
});

const fileFilter = (req,file,cb)=>{
    if(!allowedMimeTypes.includes(file.mimetype)){
     return cb(new Error("Only JPG, PNG, or PNG allowd"), false);
    }
  cb(null, true);
};

const uploadVendorDocs = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = uploadVendorDocs;
