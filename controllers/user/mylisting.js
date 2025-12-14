// controllers/tenderEvaluation.controller.js
const statusCode = require("../../utils/statusCode");
const service = require("../../services/tender/tenderEvaluationService");

exports.getTenderEvaluationPage = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const { tender, bids } = await service.getEvaluationData(
      tenderId,
      req.user._id
    );
    if (tender.status === "awarded") {
      return res.redirect(`/publisher/tender/${tenderId}/post-award`);
    }
    return res.render("profile/tenderEvaluation", {
      layout: "layouts/user/userLayout",
      tender,
      bids,
      user: req.user,
    });
  } catch (err) {
    console.log(err);

    if (err.message === "UNAUTHORIZED")
      return res.status(statusCode.FORBIDDEN).send("Unauthorized");

    if (err.message === "TENDER_NOT_FOUND")
      return res.status(statusCode.NOT_FOUND).send("Tender not found");

    return res.status(statusCode.INTERNAL_ERROR).send("Server Error");
  }
};

exports.acceptTechnicalEvaluation = async (req, res) => {
  try {
    const tenderId = await service.acceptTechnical(req.params.bidId);

    return res.redirect(
      `/user/status/my-listing/owner/tender/${tenderId}/evaluation`
    );
  } catch (err) {
    console.log(err);
    return res.status(statusCode.INTERNAL_ERROR).send("Server Error");
  }
};

exports.rejectTechnicalEvaluation = async (req, res) => {
  try {
    const tenderId = await service.rejectTechnical(req.params.bidId);

    return res.redirect(
      `/user/status/my-listing/owner/tender/${tenderId}/evaluation`
    );
  } catch (err) {
    console.log(err);
    return res.status(statusCode.INTERNAL_ERROR).send("Server Error");
  }
};

exports.selectWinner = async (req, res) => {
  try {
    const tenderId = await service.selectWinner(
      req.params.bidId,
      req.app.get("io")
    );

    return res.redirect(
      `/user/status/my-listing/owner/tender/${tenderId}/evaluation`
    );
  } catch (err) {
    console.log(err);
    return res.status(statusCode.INTERNAL_ERROR).send("Server Error");
  }
};
