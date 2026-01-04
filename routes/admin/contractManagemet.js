const express = require('express');
const router = express.Router();
const authControler = require('../../controllers/admin/contractManagement');
const authMiddleware = require('../../middlewares/adminAuth');

router.get('/', authMiddleware.adminProtect, authControler.contractManagementPage);
router.get('/contracts/:tenderId', authMiddleware.adminProtect, authControler.getContractDetails);
router.get('/file/:id', authMiddleware.adminProtect, authControler.view);

module.exports = router;
