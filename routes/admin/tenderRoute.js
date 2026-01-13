const express = require('express');
const tenderContorller = require('../../controllers/admin/tenderManagement');
const { adminProtect } = require('../../middlewares/adminAuth');
const router = express.Router();

router.get('/', adminProtect, tenderContorller.getAdminTenderPage);
router.get('/:id', adminProtect, tenderContorller.getTenderDetails);
router.patch('/status/:id', adminProtect, tenderContorller.updateTenderStatus);
router.patch('/toggle-block/:id', adminProtect, tenderContorller.toggleBlockTender);
module.exports = router;
