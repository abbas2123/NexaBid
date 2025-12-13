const statusCode = require("../../utils/statusCode");
const tenderBidService = require("../../services/tender/tenderBid");

exports.getTenderTechBidForm = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const { tender, bid, payments } = await tenderBidService.getTechBidData(
      tenderId,
      req.user
    );
    if (bid && bid.techReviewStatus === "accepted") {
      return res.redirect(`/vendor/tender/${tenderId}/financial`);
    }

    return res.render("vendor/tenderTech", {
      layout: "layouts/user/userLayout",
      title: "Tender - TechForm Submission",
      user: req.user,
      vendor: req.user,
      tender,
      tenderId,
      paymentUrl: `/vendor/payment/initiate/${tenderId}`,
      paymentStatus: payments.paymentStatus,
      bid,
    });
  } catch (err) {
    console.log(err);

    if (err.message === "NOT_VENDOR")
      return res.status(statusCode.FORBIDDEN).send("Not a vendor");

    return res.status(statusCode.INTERNAL_ERROR).send("Server Error");
  }
};

exports.uploadTechnicalPhase = async (req, res) => {
  try {
    const tenderId = req.params.id;

    await tenderBidService.uploadTechnical(tenderId, req.user._id, req.files);

    return res.redirect(`/vendor/tender/${tenderId}/bid?uploaded=true`);
  } catch (err) {
    console.log(err);
    const tenderId = req.params.id;
    if (err.message === "ALREADY_UPLOADED")
      return res.redirect(
        `/vendor/tender/${tenderId}/bid?alreadyUploaded=true`
      );

    return res.redirect(`/vendor/tender/${tenderId}/bid?uploaded=false`);
  }
};

exports.uploadFinancialPhase = async (req, res) => {
  try {
    const tenderId = req.params.id;

    await tenderBidService.uploadFinancial(
      tenderId,
      req.user._id,
      req.files,
      req.body.amount
    );

    return res.redirect(`/vendor/tender/${tenderId}/financial?uploaded=true`);
  } catch (err) {
    console.log(err);

    if (err.message === "ALREADY_UPLOADED")
      return res.redirect(
        `/vendor/tender/${tenderId}/financial?alreadyUploaded=true`
      );

    return res.status(statusCode.INTERNAL_ERROR).send(err.message);
  }
};

exports.getTenderFin = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const { tender, bid } = await tenderBidService.getFinancialBidData(
      tenderId,
      req.user._id
    );

    return res.render("vendor/tenderFin", {
      layout: "layouts/user/userLayout",
      tender,
      tenderId,
      bid,
      user: req.user,
      tenderId,
    });
  } catch (err) {
    console.log(err);

    const tenderId = req.params.id;

    if (err.message === "NO_BID")
      return res.redirect(`/vendor/tender/${tenderId}/bid`);

    if (err.message === "TECH_REJECTED")
      return res.redirect(`/vendor/tender/${tenderId}/bid?rejected=true`);

    if (err.message === "TECH_NOT_APPROVED")
      return res.redirect(`/vendor/tender/${tenderId}/bid?notApproved=true`);

    return res.status(statusCode.INTERNAL_ERROR).render("error", {
      layout: "layouts/user/userLayout",
      message: err.message,
    });
  }
};
