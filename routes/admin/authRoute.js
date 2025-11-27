const express = require('express');
const router = express.Router();

const authController = require('../../controllers/admin/authController');
const { adminProtect, preventAdminBack } = require('../../middlewares/adminAuth');
const {preventAuthPages} = require('../../middlewares/authMiddleware')

router.get('/login', preventAuthPages,authController.getAdminLogin);
router.post('/login', authController.postAdminLogin);


router.get('/dashboard', adminProtect, preventAdminBack, authController.getAdminDashboard);


router.get('/logout', authController.adminLogout);

router.get('/user-management',adminProtect,authController.getUserManagement);

router.patch('/user/block/:id',authController.blockUser);

router.patch('/user/unblock/:id',adminProtect,authController.unblockUser);

module.exports = router;