const express = require('express');

const router = express.Router();
const path = require('path');
const authController = require('../../controllers/user/tender');
const authMiddleware = require('../../middlewares/authMiddleware');
const tenderContorller = require('../../controllers/vendor/tenderCreation');
const tenderUpload = require('../../middlewares/tenderUpload');
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

router.get('/doc/:fileId', async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).send('File not found');

    const filePath = path.isAbsolute(file.fileUrl)
      ? file.fileUrl
      : path.join(process.cwd(), file.fileUrl);

    return res.download(filePath, file.fileName);
  } catch (err) {
    console.error('Download error:', err);
    return res.status(500).send('Error downloading file');
  }
});

module.exports = router;
