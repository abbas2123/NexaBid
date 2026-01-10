const postAwardService = require("../../services/vendor/postAward");
const statusCode = require("../../utils/statusCode");
const poService = require("../../services/vendor/poService");
const Tender = require("../../models/tender");
const TenderBid = require("../../models/tenderBid");
const po = require('../../models/purchaseOrder');


exports.getPublisherPostAwardPage = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const userId = req.user._id;

    const result = await postAwardService.getPublisherPostAwardService(
      tenderId,
      userId
    );

    if (result.redirectToEvaluation) return res.redirect(result.url);

    return res.render("profile/postAward", {
      layout: "layouts/user/userLayout",
      ...result,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    return res.status(statusCode.INTERNAL_ERROR).send("Server Error");
  }
};

exports.showCreatePOPage = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const user = req.user;
    const userId = req.user._id;
    const tender = await Tender.findById(tenderId);

    const oldPO = await po.findOne({
    tenderId,
    status: "vendor_rejected"
  });

  if (oldPO) {
    if (oldPO.status === "vendor_accepted")
      throw new Error("PO_ALREADY_ACCEPTED");

    if (oldPO.status !== "vendor_rejected")
      throw new Error("PO_ALREADY_EXISTS");
  }

    if (!user) return res.status(statusCode.NOT_FOUND).send("user not found");
    if (tender.createdBy.toString() !== userId.toString())
      return res.status(statusCode.FORBIDDEN).send("access denined");
    if (!tender)
      return res.status(statusCode.NOT_FOUND).send("tender not found");

    const winnerBid = await TenderBid.findOne({
      tenderId,
      isWinner: true,
    }).populate("vendorId");
    if (!winnerBid)
      return res.status(statusCode.NOT_FOUND).send("Winner vendor not found");

    const vendor = winnerBid.vendorId;
    const amount = winnerBid.quotes.amount;
    return res.render("profile/createPo", {
      layout: "layouts/user/userLayout",
      tender,
      user,
      showSuccessModal: false,
      poNumber: null,
      vendor,
      amount,
    });
  } catch (err) {
    console.log(err);
    res.status(statusCode.INTERNAL_ERROR).send("server Error");
  }
};

exports.createPO = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const po = await poService.createPO({
      tenderId,
      publisher: req.user,
      form: req.body,
      attachment: req.file,
      io: req.app.get("io"),
    });
    const winnerBid = await TenderBid.findOne({
      tenderId,
      isWinner: true,
    }).populate("vendorId");
    if (!winnerBid)
      return res.status(statusCode.NOT_FOUND).send("Winner vendor not found");

    const vendor = winnerBid.vendorId;

    return res.render("profile/createPO", {
      layout: "layouts/user/userLayout",
      tender: po.tender,
      user: req.user,
      showSuccessModal: true,
      poNumber: po.po.poNumber,
      fileUrl: po.po.fileUrl,
      vendor: vendor,
      amount: winnerBid.quotes.amount,
    });
  } catch (err) {
    console.error(err);
    res.status(statusCode.INTERNAL_ERROR).send(err.message || "Server Error");
  }
};

exports.viewPO = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const { po, tender } = await poService.getPOData(tenderId);

    return res.render("profile/viewPO", {
      layout: "layouts/user/userLayout",
      po,
      tender,
      vendor: po.vendorId,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message || "Server Error");
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
    console.error(err.message);

    if (err.message === "NO_FILE")
      return res.status(400).send("No file uploaded");

    if (err.message === "WINNER_NOT_FOUND")
      return res.status(400).send("Winner not found");

    return res.status(500).send("Upload failed");
  }
};


exports.aview = async (req, res) => {
  try {
    console.log('dsvdsdsvsdv')
    const filePath = await postAwardService.viewAgreementFile(
      req.params.id
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    return res.sendFile(filePath);
  } catch (err) {
    console.error(err.message);

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
    console.error(err.message);
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
    console.error(err.message);
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
        layout:'layouts/user/userLayout',
        tender:data.tender,
        vendor:data.vendor,
        contractRef: data.contractRef 
    });
  } catch (err) {
    console.log("Issue page error:", err);
    res.status(404).render("error",{layout:'layouts/user/userLayout',message:err.message});
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
    console.error("Issue work order error:", err.message);
    res.status(400).send(err.message);
  }
};



exports.view = async (req, res) => {
  try {
    console.log("PARAM ID:", req.params.id);
    const filePath = await postAwardService.getWorkOrderFilePath(
      req.user._id,
      req.params.id
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(filePath);
  } catch (err) {
    console.error("View work order error:", err.message);
    res.status(404).send("Work order not found");
  }
};


