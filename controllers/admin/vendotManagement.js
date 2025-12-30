const vendorService = require('../../services/admin/venderManagement');
const statusCode = require('../../utils/statusCode');
const sendMail = require('../../utils/email');
const {
  VIEWS,
  LAYOUTS,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  NOTIFICATION_MESSAGES,
} = require('../../utils/constants');

exports.getVendorApplication = async (req, res) => {
  const vendorApps = await vendorService.getAllVendorApplication();
  console.log('vendorApps', vendorApps);

  res.render(VIEWS.ADMIN_VENDOR_LIST, {
    layout: LAYOUTS.ADMIN_LAYOUT,
    title: 'Vendor Management - NexaBid',
    currentPage: 'vendor-applications',
    vendorApps,
  });
};

exports.startReview = async (req, res) => {
  try {
    const id = req.params.id;
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
    const id = req.params.id;
    const vendor = await vendorService.getAllVentdorApplicationById(id);
    console.log('ndsklnkdvndv', vendor.documents);
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
    const id = req.params.id;
    const comment = req.body.comment;
    const vendor = await vendorService.approveVendor(id, comment, req);

    res.json({ success: true, message: SUCCESS_MESSAGES.VENDOR_APPROVED });

    setTimeout(async () => {
      await sendMail.sendMailUser(
        vendor.userId.email,
        NOTIFICATION_MESSAGES.VENDOR_APPROVED_SUBJECT,
        `<h2>congratulations!</h2>
            <p>Your vendor application <b>${vendor.businessName}</b> is approved.</p>`
      );
    }, 0);
  } catch (err) {
    return res.json({ success: false, message: ERROR_MESSAGES.APPROVE_FAILED });
  }
};

exports.rejectVendor = async (req, res) => {
  try {
    const id = req.params.id;
    const comment = req.body.comment;
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
        `
       <div style="font-family: Arial; padding: 20px; border-radius: 10px; border: 1px solid #ddd;">
      <h2 style="color: #d9534f;">Vendor Application Update</h2>

      <p>Hello <strong>${vendor.userId.name}</strong>,</p>

      <p>Your vendor application for <strong>${vendor.businessName}</strong> has been <span style="color:red;">rejected</span>.</p>

      <p>You may update your documents and apply again.</p>

      <p>Regards,<br><strong>NexaBid Admin Team</strong></p>
  </div>`
      );
    }, 0);
  } catch (err) {
    return res.json({ success: false, message: ERROR_MESSAGES.REJECT_FAILED });
  }
};

exports.removeVendor = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await vendorService.removeVendorService(id, req);

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
