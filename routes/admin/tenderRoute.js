const express = require('express');
const router = express.Router();
const tenderContorller = require('../../controllers/admin/tenderManagement');

router.get('/',tenderContorller.getAdminTenderPage);
router.get("/:id", tenderContorller.getTenderDetails);
router.patch('/status/:id',tenderContorller.updateTenderStatus);



module.exports =router;