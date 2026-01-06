const express = require('express');

const router = express.Router();

const authController = require('../../controllers/user/tender');
const authMiddleware = require('../../middlewares/authMiddleware');
const tenderContorller = require('../../controllers/vendor/tenderCreation');
const tenderUpload = require('../../middlewares/cloudinaryUploader');
const Tender = require('../../models/tender');
const File = require('../../models/File');
const statusCode = require('../../utils/statusCode');

router.get('/', authMiddleware.protectRoute, authController.getTenderListingPage);
router.get('/create', authMiddleware.protectRoute, tenderContorller.getCreateTenderPage);
router.post(
  '/create',
  authMiddleware.protectRoute,
  tenderUpload.array('docs', 10),
  tenderContorller.createTenderController
);
router.get('/status/:id', async (req, res) => {
  try {
    const tender = await Tender.findById(req.params.id).select('status');
    if (!tender) {
      return res.status(statusCode.NOT_FOUND).json({ success: false });
    }

    return res.status(statusCode.OK).json({
      success: true,
      status: tender.status,
    });
  } catch (error) {
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
    });
  }
});
router.get('/:id', authMiddleware.protectRoute, authController.getTenderDetailsPage);
router.patch(
  '/resubmit/:id',
  authMiddleware.protectRoute,
  tenderUpload.array('docs', 10),
  authController.resubmitTender
);

router.get('/doc/:fileId', authMiddleware.protectRoute, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).send('File not found');

    let viewUrl = file.fileUrl;

    // If PDF → force inline display
    if (file.mimeType === 'application/pdf') {
      viewUrl = file.fileUrl.replace('/raw/upload/', '/raw/upload/fl_attachment:false/');
    }

    // Redirect browser to Cloudinary file
    return res.redirect(viewUrl);
  } catch (err) {
    console.error('Doc view error:', err);
    return res.status(500).send('Unable to open file');
  }
});

module.exports = router;
