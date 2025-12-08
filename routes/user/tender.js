const express = require('express');
const router = express.Router();
const authController = require('../../controllers/user/tender');
const authMiddleware = require('../../middlewares/authMiddleware');
const tenderContorller = require('../../controllers/vendor/tenderCreation');
const tenderUpload = require('../../middlewares/tenderUpload')
const Tender = require('../../models/tender');

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
module.exports = router