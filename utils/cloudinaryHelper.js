const cloudinary = require('../config/cloudinary');

const uploadToCloudinary = (buffer, folder, filename, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, '_');

    const uploadOptions = {
      resource_type: resourceType,
      folder: folder,
      public_id: sanitizedName,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });

    stream.end(buffer);
  });
};

const generateSignedUrl = (publicId, version, resourceType = 'image', format = null) => {
  const options = {
    resource_type: resourceType,
    type: 'upload',
    sign_url: true,
    secure: true,
    version: version,
  };

  if (format) {
    options.format = format;
  }

  return cloudinary.url(publicId, options);
};

module.exports = {
  uploadToCloudinary,
  generateSignedUrl,
};
