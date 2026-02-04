const postAwardService = require('../../services/vendor/postAward');
const statusCode = require('../../utils/statusCode');
const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');
exports.getPublisherPostAwardPage = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const userId = req.user._id;
    const result = await postAwardService.getPublisherPostAwardService(tenderId, userId);
    if (result.redirectToTracking) {
      return res.redirect(`/publisher/work-orders/${result.workOrderId}/tracking`);
    }
    if (result.redirectToEvaluation) return res.redirect(result.url);
    res.render(VIEWS.PROFILE_POST_AWARD, {
      layout: LAYOUTS.USER_LAYOUT,
      ...result,
      user: req.user,
    });
  } catch (err) {
    return res.status(statusCode.INTERNAL_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};

exports.getUploadPage = async (req, res) => {
  const tenderId = req.params.id;

  return res.render("profile/draftAgreement", {
    layout: "layouts/user/userLayout",
    tenderId,
  });
};




exports.uploadAgreement = async (req, res) => {
  try {
    await postAwardService.uploadPublisherAgreement({
      tenderId: req.params.id,
      publisherId: req.user._id,
      file: req.file,
    });

    return res.redirect(
      `/publisher/tender/${req.params.id}/post-award?agreement=publisherUploaded`
    );
  } catch (err) {

    if (err.message === "NO_FILE")
      return res.status(400).send("No file uploaded");

    if (err.message === "WINNER_NOT_FOUND")
      return res.status(400).send("Winner not found");

    return res.status(500).send("Upload failed");
  }
};


exports.aview = async (req, res) => {
  try {
    const filePath = await postAwardService.viewAgreementFile(
      req.params.id
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    return res.sendFile(filePath);
  } catch (err) {

    if (err.message === "FILE_NOT_FOUND")
      return res.status(404).send("File not found");

    return res.status(500).send("Unable to open file");
  }
};


exports.approveAgreement = async (req, res) => {
  try {
    const agreement = await postAwardService.approveAgreement(
      req.params.agreementId
    );

    return res.redirect(
      `/publisher/tender/${agreement.tenderId}/post-award?agreement=approved`
    );
  } catch (err) {
    return res.status(500).send("Approval failed");
  }
};


exports.rejectAgreement = async (req, res) => {
  try {
    const agreement = await postAwardService.rejectAgreement({
      agreementId: req.params.agreementId,
      remarks: req.body.remarks,
    });

    return res.redirect(
      `/publisher/tender/${agreement.tenderId}/post-award?agreement=rejected`
    );
  } catch (err) {
    return res.status(500).send("Reject failed");
  }
};



exports.issuePage = async (req, res) => {
  try {
    const { tenderId } = req.params;

    const data = await postAwardService.getIssuePageData(
      req.user._id,
      tenderId
    );

    res.render("profile/workOrder", {
      layout: 'layouts/user/userLayout',
      tender: data.tender,
      vendor: data.vendor,
      contractRef: data.contractRef
    });
  } catch (err) {
    res.status(404).render("error", { layout: 'layouts/user/userLayout', message: err.message });
  }
};


exports.issueWorkOrder = async (req, res) => {
  try {
    const { tenderId } = req.params;

    await postAwardService.issueWorkOrder(
      req.user._id,
      tenderId,
      req.body,
      req.file
    );

    res.redirect(`/publisher/tender/${tenderId}/post-award`);
  } catch (err) {
    res.status(400).send(err.message);
  }
};



exports.view = async (req, res) => {
  try {
    const filePath = await postAwardService.getWorkOrderFilePath(
      req.user._id,
      req.params.id
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(filePath);
  } catch (err) {
    res.status(404).send("Work order not found");
  }
};
