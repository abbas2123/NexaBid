const express = require('express');
const router = express.Router();
const authController = require('../../controllers/user/tender');
const authMiddleware = require('../../middlewares/authMiddleware');

router.get('/',authMiddleware.protectRoute,authController.getTenderListingPage);
router.get('/:id',authMiddleware.protectRoute,authController.getTenderDetailsPage)

module.exports = router