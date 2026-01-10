const cloudinary = require('../../config/cloudinary');
const axios = require('axios');
const File = require('../../models/File');

exports.downloadSecureFile = async (req, res) => {
    try {
        console.log('fdsdsvd')
        const { fileId } = req.params;
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).send('File not found');
        }


        const meta = file.metadata || {};

        let publicId = meta.public_id || file.fileUrl.split('/').pop().split('.')[0];

        // Legacy fallback only if we strictly know it's missing (rare now)
        if (!meta.resource_type && !publicId.toLowerCase().endsWith('.pdf')) {
            publicId += '.pdf';
        }

        const resourceType = meta.resource_type || 'raw';
        const type = meta.type || 'authenticated';
        const version = meta.version || file.version || 1;

        // Cloudinary authenticated URL generation
        const cloudinaryUrl = cloudinary.url(publicId, {
            resource_type: resourceType,
            type: type,
            sign_url: true,
            secure: true,
            version: version,
            expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        });

        const response = await axios.get(cloudinaryUrl, {
            responseType: 'arraybuffer',
            validateStatus: (status) => status < 400,
        });

        // Force correct headers for PDF to override Cloudinary's "octet-stream"
        res.setHeader('Content-Type', 'application/pdf');

        // Ensure filename has .pdf extension to prevent "row file" saves
        const safeFileName = file.fileName.toLowerCase().endsWith('.pdf')
            ? file.fileName
            : `${file.fileName}.pdf`;

        res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);

        res.send(response.data);
    } catch (error) {
        console.error('[Proxy Error] Message:', error.message);
        if (error.response) {
            console.error('[Proxy Error] Upstream Status:', error.response.status);
            return res.status(error.response.status).send(`Upstream download failed`);
        }
        res.status(500).send('Server Error');
    }
};
