const authController = require('../../controllers/user/property');
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware')

router.get('/',authMiddleware.protectRoute,authController.getPropertyPage);

router.get("/:id", authMiddleware.protectRoute, authController.getPropertyDetails);


module.exports=router;