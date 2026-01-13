const express = require('express');
const authControler = require('../../controllers/admin/contractManagement');
const authMiddleware = require('../../middlewares/adminAuth');
const router = express.Router();
router.get('/', authMiddleware.adminProtect, authControler.contractManagementPage);
router.get('/contracts/:tenderId', authMiddleware.adminProtect, authControler.getContractDetails);
router.get('/file/:id', authMiddleware.adminProtect, authControler.view);
module.exports = router;
