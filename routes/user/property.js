const express = require('express');
const authController = require('../../controllers/user/property');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const propertyUpload = require('../../middlewares/cloudinaryUploader');

router.get('/create', authMiddleware.protectRoute, authController.getCreatePropertyPage);
router.post(
  '/create',
  authMiddleware.protectRoute,
  propertyUpload.fields([
    { name: 'media', maxCount: 10 },
    { name: 'docs', maxCount: 10 },
  ]),
  authController.postCreateProperty
);

router.get('/', authMiddleware.protectRoute, authController.getPropertyPage);

router.get('/:id', authMiddleware.protectRoute, authController.getPropertyDetails);

router.patch(
  '/update/:id',
  authMiddleware.protectRoute,
  propertyUpload.fields([
    { name: 'media', maxCount: 10 },
    { name: 'docs', maxCount: 10 },
  ]),
  authController.updatePropertyController
);

module.exports = router;
