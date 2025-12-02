const vendorService = require("../../services/admin/venderManagement");
const statusCode = require("../../utils/statusCode");
const sendMail = require("../../utils/email");

exports.getVendorApplication = async (req, res) => {
  const vendorApps = await vendorService.getAllVendorApplication();
  console.log("vendorApps", vendorApps);
  res.render("admin/vendorList", {
    layout: "layouts/admin/adminLayout",
    title: "Vendor Management - NexaBid",
    currentPage: "vendor-applications",
    vendorApps,
  });
};

exports.startReview = async (req, res) => {
  try {
    const id = req.params.id;
    const vendor = await vendorService.startReview(id);

    return res.json({
      success: true,
      message: "Review started",
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
    console.log(vendor.documents);
    return res.json({ success: true, vendor });
  } catch (err) {
    return res.json({ success: false, message: "Unable to load vendor" });
  }
};
exports.approveVendor = async (req, res) => {
  try {
    const id = req.params.id;
    const comment = req.body.comment;
    const vendor = await vendorService.approveVendor(id, comment);

    res.json({ success: true, message: "Vendor approved" });

    setTimeout(async () => {
      await sendMail.sendMailUser(
        vendor.userId.email,
        "vendor Application Approved 🎉",
        `<h2>congratulations!</h2>
            <p>Your vendor application <b>${vendor.businessName}</b> is approved.</p>`,
      );
    }, 0);
  } catch (err) {
    return res.json({ success: true, message: "Approve failed" });
  }
};

exports.rejectVendor = async (req, res) => {
  try {
    const id = req.params.id;
    const comment = req.body.comment;
    const vendor = await vendorService.rejectVendor(id, comment);

    if (!vendor) {
      return res.json({ success: false, message: "vendor not found" });
    }
    res.json({ success: true, message: "Vendor rejected" });
    setTimeout(async () => {
      await sendMail.sendMailUser(
        vendor.userId.email,
        "Vendor Application Rejected ❌",
        `
       <div style="font-family: Arial; padding: 20px; border-radius: 10px; border: 1px solid #ddd;">
      <h2 style="color: #d9534f;">Vendor Application Update</h2>

      <p>Hello <strong>${vendor.userId.name}</strong>,</p>

      <p>Your vendor application for <strong>${vendor.businessName}</strong> has been <span style="color:red;">rejected</span>.</p>

      <p>You may update your documents and apply again.</p>

      <p>Regards,<br><strong>NexaBid Admin Team</strong></p>
  </div>`,
      );
    }, 0);
  } catch (err) {
    return res.json({ success: false, messsage: "Reject failed" });
  }
};

exports.removeVendor = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await vendorService.removeVendorService(id);

    return res.json({
      success: true,
      message: "Vendor access removed successfully",
    });
  } catch (err) {
    console.error("Remove Vendor Error:", err);
    return res.json({
      success: false,
      message: "Failed to remove vendor",
    });
  }
};
