const express = require('express');
const router = express.Router();
const authController = require('../../controllers/user/tender');
const authMiddleware = require('../../middlewares/authMiddleware');
const tenderContorller = require('../../controllers/vendor/tenderCreation');
const tenderUpload = require('../../middlewares/tenderUpload')
const Tender = require('../../models/tender');
const File = require('../../models/File');
const path = require('path');

router.get('/',authMiddleware.protectRoute,authController.getTenderListingPage);
router.get('/create',authMiddleware.protectRoute,tenderContorller.getCreateTenderPage);
router.post('/create',authMiddleware.protectRoute,tenderUpload.array('docs',10),tenderContorller.createTenderController)
router.get("/status/:id", async (req, res) => {
  try {
    const tender = await Tender.findById(req.params.id).select("status");
    if (!tender) {
      return res.status(404).json({ success: false });
    }

    return res.json({
      success: true,
      status: tender.status
    });

  } catch (error) {
    return res.json({

      success: false
    });
  }
});
router.get('/:id',authMiddleware.protectRoute,authController.getTenderDetailsPage)
router.patch(
  "/resubmit/:id",
  authMiddleware.protectRoute,
  tenderUpload.array("docs", 10),
  authController.resubmitTender
);

router.get("/doc/:fileId", async (req, res) => {
  try {
    console.log("😍 route hit");

    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).send("File not found");
    }

    console.log("📌 DB file object:", file);

    const sanitizedUrl = file.fileUrl.replace("/", "");
    const filePath = path.join(__dirname, "../../", sanitizedUrl);


    console.log("📌 File resolved path:", filePath);

    return res.download(filePath);

  } catch (err) {
    console.log("❌ Download error", err);
    return res.status(500).send("Error downloading file");
  }
});

module.exports = router