const express = require('express');
const authController = require('../../controllers/user/myProfile');
const authMiddleware = require('../../middlewares/authMiddleware');
const uploadFactory = require('../../middlewares/upload');
const uploadAvatar = uploadFactory('nexabid/profiles', ['jpg', 'jpeg', 'png'], 5 * 1024 * 1024);

const router = express.Router();

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
