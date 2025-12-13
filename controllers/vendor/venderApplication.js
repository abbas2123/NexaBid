const vendorService = require("../../services/vendor/applicationService");
const statusCode = require("../../utils/statusCode");
const OCRResult = require("../../models/OCR_Result");
const { application } = require("express");
const vendorApplication = require("../../models/vendorApplication");

exports.getVendorApplicationPage = async (req, res) => {
  try {
    console.log("Auth: JWT user");

    if (!req.user) {
      console.log("❌ No user — redirecting to login");
      return res.redirect("/auth/login");
    }
    const user = req.user;

    console.log("user.......", user.role);
    if (user.role === "vendor") {
      console.log("klndjafnladjfad");
      return res.redirect("/auth/dashboard");
    }
    const existingApp = await vendorService.getApplicationStatus(user._id);
    let ocrResult = null;

    if (existingApp?.ocrResultId) {
      const ocrDoc = await OCRResult.findById(existingApp.ocrResultId);
      ocrResult = ocrDoc?.extracted || null;
    }
    res.render("vendor/vendorApplication.ejs", {
      layout: "layouts/user/userLayout",
      title: "Vendor Application",
      vendor: req.user,
      user,
      application: existingApp || null,
      ocrResult,
      error: null,
      success: null,
    });
  } catch (err) {
    console.error("error loading vender page:", err);
    res.status(statusCode.INTERNAL_ERROR).send("server Error");
  }
};

exports.submitVendorApplication = async (req, res) => {
  let existingApp = null;
  let updatedApp = null;
  let result = { extracted: null, fraud: null };

  try {
    const actionType = req.body.actionType;
    const isConfirmed = req.body.isConfirmed === "true";
    const userId = req.user._id;

    existingApp = await vendorService.getApplicationStatus(userId);

    // Security check
    if (existingApp && existingApp.userId.toString() !== userId.toString()) {
      return res.status(statusCode.FORBIDDEN).send("Forbidden: Access Denied");
    }

    // ---- 1) OCR SCAN FLOW ----
    if (actionType === "scan") {
      if (!req.files || req.files.length === 0) {
        return res.json({
          success: false,
          message: "Please upload at least one document",
        });
      }
      try {
        result = await vendorService.submitApplicationService(
          req.user,
          req.files,
          "scan"
        );
      } catch (err) {
        return res.json({ success: false, message: err.message });
      }
      // updatedApp = await vendorService.getApplicationStatus(userId);

      return res.json({
        success: true,
        message: "OCR scan completed! Please confirm & submit",
        redirectUrl: "/vendor/apply",
      });
    }

    // ---- 2) CONFIRMATION REQUIRED ----
    updatedApp = await vendorService.getApplicationStatus(userId);

    if (!isConfirmed) {
      return res.json({
        success: false,
        message: "Please confirm your details first",
      });
    }

    // ---- 3) TERMS REQUIRED ----
    if (!req.body.terms) {
      return res.json({
        success: false,
        message: "You must agree to the terms",
      });
    }

    // ---- 4) SUBMIT APPLICATION ----
    await vendorApplication.findOneAndUpdate(
      { userId },
      { $set: { status: "submitted" } },
      { new: true }
    );

    return res.status(statusCode.OK).json({
      success: true,
      message: "Application submitted successfullt!",
      redirectUrl: "/auth/dashboard",
    });
  } catch (err) {
    console.error("Submit Vendor Error:", err);
    return res.json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
};
