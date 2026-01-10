

const express = require('express');
const tenderContorller = require('../../controllers/admin/tenderManagement');

const router = express.Router();

router.get('/', tenderContorller.getAdminTenderPage);
router.get('/:id', tenderContorller.getTenderDetails);
router.patch('/status/:id', tenderContorller.updateTenderStatus);

module.exports = router;
