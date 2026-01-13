const express = require('express');
const landingController = require('../../controllers/user/landingController');
const authMiddleware = require('../../middlewares/authMiddleware');
const router = express.Router();
router.get('/', authMiddleware.preventAuthPages, landingController.loadLandingPage);
module.exports = router;
