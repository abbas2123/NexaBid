const vendorService = require('../../services/vendor/applicationService');
const statusCode = require('../../utils/statusCode');
const OCRResult = require('../../models/OCR_Result');
const vendorApplication = require('../../models/vendorApplication');

const {
  LAYOUTS,
  ERROR_MESSAGES,
  ROLES,
  REDIRECTS,
  VIEWS,
  ACTION_TYPES,
  SUCCESS_MESSAGES,
  APPLICATION_STATUS,
  TITLES,
} = require('../../utils/constants');

exports.getVendorApplicationPage = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(REDIRECTS.LOGIN);
    }
    const { user } = req;

    if (user.role === ROLES.VENDOR) {
      return res.redirect(REDIRECTS.AUTH_DASHBOARD);
    }
    const existingApp = await vendorService.getApplicationStatus(user._id);
    let ocrResult = null;

    if (existingApp?.ocrResultId) {
      const ocrDoc = await OCRResult.findById(existingApp.ocrResultId);
      ocrResult = ocrDoc?.extracted || null;
    }
    res.render(VIEWS.VENDOR_APPLICATION, {
      layout: LAYOUTS.USER_LAYOUT,
      title: TITLES.VENDOR_APPLICATION,
      vendor: req.user,
      user,
      application: existingApp || null,
      ocrResult,
      error: null,
      success: null,
    });
  } catch (err) {
    console.error('error loading vender page:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};

exports.submitVendorApplication = async (req, res) => {
  let existingApp = null;
  let updatedApp = null;

  try {
    const { actionType } = req.body;
    const isConfirmed = req.body.isConfirmed === 'true';
    const userId = req.user._id;

    existingApp = await vendorService.getApplicationStatus(userId);
    
    if (existingApp && existingApp.userId.toString() !== userId.toString()) {
      return res.status(statusCode.FORBIDDEN).send(ERROR_MESSAGES.FORBIDDEN_ACCESS);
    }

    
    if (actionType === ACTION_TYPES.SCAN) {
      if (!req.files || req.files.length === 0) {
        return res.json({
          success: false,
          message: ERROR_MESSAGES.UPLOAD_REQUIRED,
        });
      }
      try {
        await vendorService.submitApplicationService(req.user, req.files, ACTION_TYPES.SCAN);
      } catch (err) {
        return res.json({ success: false, message: err.message });
      }
      

      return res.json({
        success: true,
        message: SUCCESS_MESSAGES.OCR_COMPLETED,
        redirectUrl: REDIRECTS.VENDOR_APPLY,
      });
    }

    
    updatedApp = await vendorService.getApplicationStatus(userId);

    if (!updatedApp) {
      return res.json({
        success: false,
        message: ERROR_MESSAGES.PLEASE_SCAN_DOCUMENTS_FIRST,
      });
    }
    if (!isConfirmed) {
      return res.json({
        success: false,
        message: ERROR_MESSAGES.CONFIRMATION_REQUIRED,
      });
    }

    
    if (!req.body.terms) {
      return res.json({
        success: false,
        message: ERROR_MESSAGES.TERMS_REQUIRED,
      });
    }

    
    await vendorApplication.findOneAndUpdate(
      { userId },
      { $set: { status: APPLICATION_STATUS.SUBMITTED } },
      { new: true }
    );

    return res.status(statusCode.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.APPLICATION_SUBMITTED,
      redirectUrl: REDIRECTS.AUTH_DASHBOARD,
    });
  } catch (err) {
    console.error('Submit Vendor Error:', err);
    return res.json({
      success: false,
      message: err.message || ERROR_MESSAGES.GENERIC_ERROR,
    });
  }
};
