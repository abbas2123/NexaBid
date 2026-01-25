const express = require('express');
const authController = require('../../controllers/user/property');
const authMiddleware = require('../../middlewares/authMiddleware');
const uploadFactory = require('../../middlewares/upload');
const propertyUpload = uploadFactory('nexabid/properties');
const validate = require('../../middlewares/validate');
const propertySchema = require('../../validators/propertyValidator');
const router = express.Router();
router.get('/create', authMiddleware.protectRoute, authController.getCreatePropertyPage);
router.post(
  '/create',
  authMiddleware.protectRoute,
  propertyUpload.fields([
    { name: 'media', maxCount: 10 },
    { name: 'docs', maxCount: 10 },
  ]),
  validate(propertySchema),
  authController.postCreateProperty
);
router.get('/', authMiddleware.protectRoute, authController.getPropertyPage);
router.get('/status/:id', authMiddleware.protectRoute, authController.getPropertyStatus);
router.get('/:id', authMiddleware.protectRoute, authController.getPropertyDetails);
router.patch(
  '/update/:id',
  authMiddleware.protectRoute,
  propertyUpload.fields([
    { name: 'media', maxCount: 10 },
    { name: 'docs', maxCount: 10 },
  ]),
  validate(propertySchema),
  authController.updatePropertyController
);
module.exports = router;
