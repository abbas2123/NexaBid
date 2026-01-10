const vendorService = require('../../services/admin/venderManagement');
const sendMail = require('../../utils/email');
const statusCode = require('../../utils/statusCode');

const {
  VIEWS,
  LAYOUTS,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,

  NOTIFICATION_MESSAGES,
  TITLES,
} = require('../../utils/constants');
exports.getAllVendorApplications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const filter = {
      status: req.query.status || '',
    };

    const vendorApps = await vendorService.getAllVendorApplications(page, filter);

    res.render(VIEWS.ADMIN_VENDOR_LIST, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      title: TITLES.VENDOR_APPLICATIONS,
      vendorApps: vendorApps.applications,
      pagination: vendorApps.pagination,
      applied: filter,
      currentPage: 'vendor-applications',
    });
  } catch (err) {
    console.error('Error loading vendor applications:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};

exports.startReview = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await vendorService.startReview(id);

    return res.json({
      success: true,
      message: SUCCESS_MESSAGES.REVIEW_STARTED,
      vendor,
    });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

exports.getVendorDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await vendorService.getAllVentdorApplicationById(id);
    return res.json({ success: true, vendor });
  } catch (err) {
    return res.json({
      success: false,
      message: ERROR_MESSAGES.LOAD_VENDOR_FAILED,
    });
  }
};
exports.approveVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const vendor = await vendorService.approveVendor(id, comment, req);

    res.json({ success: true, message: SUCCESS_MESSAGES.VENDOR_APPROVED });

    setTimeout(async () => {
      await sendMail.sendMailUser(
        vendor.userId.email,
        NOTIFICATION_MESSAGES.VENDOR_APPROVED_SUBJECT,
        `<p>${NOTIFICATION_MESSAGES.VENDOR_APPROVED_BODY}</p>`
      );
    }, 0);
  } catch (err) {
    return res.json({ success: false, message: ERROR_MESSAGES.APPROVE_FAILED });
  }
};

exports.rejectVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const vendor = await vendorService.rejectVendor(id, comment, req);

    if (!vendor) {
      return res.json({
        success: false,
        message: ERROR_MESSAGES.VENDOR_NOT_FOUND,
      });
    }
    res.json({ success: true, message: SUCCESS_MESSAGES.VENDOR_REJECTED });
    setTimeout(async () => {
      await sendMail.sendMailUser(
        vendor.userId.email,
        NOTIFICATION_MESSAGES.VENDOR_REJECTED_SUBJECT,
        `<p>${NOTIFICATION_MESSAGES.VENDOR_REJECTED_BODY}<br>Reason: ${comment}</p>`
      );
    }, 0);
  } catch (err) {
    return res.json({ success: false, message: ERROR_MESSAGES.REJECT_FAILED });
  }
};

exports.removeVendor = async (req, res) => {
  try {
    const { id } = req.params;

    await vendorService.removeVendorService(id, req);

    return res.json({
      success: true,
      message: SUCCESS_MESSAGES.VENDOR_REMOVED,
    });
  } catch (err) {
    console.error('Remove Vendor Error:', err);
    return res.json({
      success: false,
      message: ERROR_MESSAGES.REMOVE_FAILED,
    });
  }
};
