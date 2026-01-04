const router = require('express').Router();
const authAdmin = require('../../middlewares/adminAuth');
const adminControler = require('../../controllers/admin/couponmanagement');

router.get('/', authAdmin.adminProtect, adminControler.couponManagementPage);
router.post('/create', authAdmin.adminProtect, adminControler.createCoupon);
router.patch('/toggle/:id', authAdmin.adminProtect, adminControler.toggleCouponStatus);
router.delete('/:id', authAdmin.adminProtect, adminControler.deleteCoupon);

module.exports = router;
