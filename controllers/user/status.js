const path = require('path');
const fs = require('fs');
const propertyService = require('../../services/property/propertyService');
const Property = require('../../models/property');
const Tender = require('../../models/tender');
const tenderService = require('../../services/tender/tender');
const File = require('../../models/File');
const statusCode = require('../../utils/statusCode');
const { LAYOUTS, VIEWS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../utils/constants');

exports.propertyStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/auth/login');
    }

    const { user } = req;

    const properties = await Property.find({
      sellerId: user._id,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.render('profile/propertyStatus', {
      layout: LAYOUTS.USER_LAYOUT,
      properties,
      user,
    });
  } catch (err) {
    console.log('Property status error', err);
    res.render(VIEWS.ERROR, { layout: LAYOUTS.USER_LAYOUT, message: ERROR_MESSAGES.SERVER_ERROR });
  }
};

exports.getEditPropertyPage = async (req, res) => {
  try {
    const propertyId = req.params.id;

    const { property, media, docs } = await propertyService.getPropertyForEdit(propertyId);

    return res.render('user/createProperty', {
      layout: LAYOUTS.USER_LAYOUT,
      title: 'Edit Property',
      property,
      media,
      docs,
      user: req.user,
      googleMapsApiKey: process.env.MAPS_API_KEY,
    });
  } catch (err) {
    console.error('Edit property page error:', err);

    return res.status(err.statusCode || statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: err.message || 'Something went wrong',
    });
  }
};

exports.deleteProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const userId = req.user._id;

    await propertyService.deleteUserProperty(propertyId, userId);

    return res.redirect('/user/status/propertyStatus');
  } catch (err) {
    console.error('❌ Delete Property Error:', err);

    return res.status(err.statusCode || statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

exports.deleteSingleDoc = async (req, res) => {
  try {
    const { propertyId, docId } = req.params;
    const userId = req.user._id;

    await propertyService.deleteUserPropertyDoc(propertyId, docId, userId);

    return res.json({
      success: true,
      message: SUCCESS_MESSAGES.DOCUMENT_REMOVED,
      docId,
    });
  } catch (err) {
    console.error('Delete doc error:', err);
    return res.status(err.statusCode || statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

exports.deleteSingleMedia = async (req, res) => {
  try {
    const { propertyId, mediaId } = req.params;
    const userId = req.user._id;

    await propertyService.deleteUserPropertyImage(propertyId, mediaId, userId);

    return res.json({
      success: true,
      message: SUCCESS_MESSAGES.IMAGE_REMOVED,
      mediaId,
    });
  } catch (err) {
    console.error('Delete media error:', err);

    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

exports.getTenderStatusPage = async (req, res) => {
  try {
    if (!req.user) return res.redirect('/auth/login');

    const tenders = await Tender.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).lean();

    return res.render('profile/tenderStatus', {
      layout: LAYOUTS.USER_LAYOUT,
      tenders,
      user: req.user,
      title: 'My Tender Status',
    });
  } catch (error) {
    console.log('Tender Status Error', error);
    return res.render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.UNABLE_LOAD_TENDER_STATUS,
    });
  }
};

exports.getResubmitTenderPage = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const { tender, files } = await tenderService.getTenderForResubmit(tenderId);

    return res.render('vendor/tenderCreate', {
      layout: LAYOUTS.USER_LAYOUT,
      title: 'Re-Submit Tender',
      tender,
      files,
      user: req.user,
    });
  } catch (err) {
    console.error('Resubmit tender page error:', err);

    return res.status(err.statusCode || statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: err.message || 'Something went wrong',
    });
  }
};

exports.deleteTender = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const tender = await Tender.findOne({
      _id: tenderId,
      createdBy: req.user._id,
    });

    if (!tender) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.TENDER_NOT_FOUND_UNAUTHORIZED,
      });
    }

    // delete documents
    const fileIds = tender.files.map((f) => f.fileId);

    if (fileIds.length > 0) {
      const files = await File.find({ _id: { $in: fileIds } });
      for (const f of files) {
        try {
          const filePath = path.join(process.cwd(), 'uploads', 'tender-docs', f.fileName);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (err) {
          return res.render(VIEWS.ERROR, {
            layout: LAYOUTS.USER_LAYOUT,
            message: ERROR_MESSAGES.FILE_NOT_FOUND,
          });
        }
      }

      await File.deleteMany({ _id: { $in: fileIds } });
    }

    await Tender.deleteOne({ _id: tenderId });

    return res.json({
      success: true,
      message: SUCCESS_MESSAGES.TENDER_DELETED,
    });
  } catch (error) {
    console.log('Tender deletion error:', error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR_DELETING_TENDER,
    });
  }
};
