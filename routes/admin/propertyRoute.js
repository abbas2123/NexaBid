

const express = require('express');
const { adminProtect } = require('../../middlewares/adminAuth');
const authProperty = require('../../controllers/admin/propertyManagement');

const router = express.Router();

router.get('/', adminProtect, authProperty.getAllProperties);

router.patch('/approve/:id', adminProtect, authProperty.approveProperty);

router.patch('/reject/:id', adminProtect, authProperty.rejectProperty);

router.get('/:id', adminProtect, authProperty.getPropertyDetails);
router.get('/view/live/:propertyId', adminProtect, authProperty.adminLiveAuctionPage);
module.exports = router;
