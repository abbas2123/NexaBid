console.log('🔥 userProfile ROUTES LOADED');
const express = require('express');

const router = express.Router();

const authController = require('../../controllers/user/myProfile');
const authMiddleware = require('../../middlewares/authMiddleware');

const uploadAvatar = require('../../middlewares/profileUpload');

router.post(
  '/update-profile',
  authMiddleware.protectRoute,
  (req, res, next) => {
    console.log('🔥 BEFORE MULTER');
    next();
  },
  uploadAvatar.any(),
  (req, res, next) => {
    console.log(
      '📄 AFTER MULTER: req.file =',
      req.file,
      'req.files =',
      req.files && req.files.length
    );
    next();
  },
  authController.updateProfile
);

router.post('/change-password', authMiddleware.protectRoute, authController.changePassword);

module.exports = router;
