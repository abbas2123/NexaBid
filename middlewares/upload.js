const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

const createUploader = (
  folderName,
  allowedFormats = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
  maxFileSize = 10 * 1024 * 1024,
  storageType = 'memory'
) => {
  let storage;

  if (storageType === 'memory') {
    storage = multer.memoryStorage();
  } else {
    storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: async (req, file) => {
        return {
          folder: folderName,
          allowed_formats: allowedFormats,
          resource_type: 'auto',
          public_id: `${path.parse(file.originalname).name}-${Date.now()}`,
        };
      },
    });
  }

  return multer({
    storage: storage,
    limits: { fileSize: maxFileSize },
  });
};

module.exports = createUploader;
