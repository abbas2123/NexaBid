const postAwardService = require('../../services/vendor/postAward');
const statusCode = require('../../utils/statusCode');
const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');
const poService = require('../../services/vendor/poService');
const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');
const po = require('../../models/purchaseOrder');

exports.getPublisherPostAwardPage = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const userId = req.user._id;

    const result = await postAwardService.getPublisherPostAwardService(tenderId, userId);

    if (result.redirectToEvaluation) return res.redirect(result.url);

    return res.render('profile/postAward', {
      layout: LAYOUTS.USER_LAYOUT,
      ...result,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    return res.status(statusCode.INTERNAL_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.showCreatePOPage = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const { user } = req;
    const userId = req.user._id;
    const tender = await Tender.findById(tenderId);

    const oldPO = await po.findOne({
      tenderId,
      status: 'vendor_rejected',
    });

    if (oldPO) {
      if (oldPO.status === 'vendor_accepted') throw new Error(ERROR_MESSAGES.PO_ALREADY_ACCEPTED);

      if (oldPO.status !== 'vendor_rejected') throw new Error(ERROR_MESSAGES.PO_ALREADY_EXISTS);
    }

    if (!user) return res.status(statusCode.NOT_FOUND).send(ERROR_MESSAGES.USER_NOT_FOUND);
    if (tender.createdBy.toString() !== userId.toString())
      return res.status(statusCode.FORBIDDEN).send(ERROR_MESSAGES.ACCESS_DENIED);
    if (!tender) return res.status(statusCode.NOT_FOUND).send(ERROR_MESSAGES.TENDER_NOT_FOUND);

    const winnerBid = await TenderBid.findOne({
      tenderId,
      isWinner: true,
    }).populate('vendorId');
    if (!winnerBid) return res.status(statusCode.NOT_FOUND).send(ERROR_MESSAGES.WINNER_VENDOR_NOT_FOUND);

    const vendor = winnerBid.vendorId;
    const { amount } = winnerBid.quotes;
    return res.render('profile/createPo', {
      layout: LAYOUTS.USER_LAYOUT,
      tender,
      user,
      showSuccessModal: false,
      poNumber: null,
      vendor,
      amount,
    });
  } catch (err) {
    console.log(err);
    res.status(statusCode.INTERNAL_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
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
      io: req.app.get('io'),
    });
    const winnerBid = await TenderBid.findOne({
      tenderId,
      isWinner: true,
    }).populate('vendorId');
    if (!winnerBid) return res.status(statusCode.NOT_FOUND).send(ERROR_MESSAGES.WINNER_VENDOR_NOT_FOUND);

    const vendor = winnerBid.vendorId;

    return res.render('profile/createPO', {
      layout: LAYOUTS.USER_LAYOUT,
      tender: po.tender,
      user: req.user,
      showSuccessModal: true,
      poNumber: po.po.poNumber,
      fileUrl: po.po.fileUrl,
      vendor,
      amount: winnerBid.quotes.amount,
    });
  } catch (err) {
    console.error(err);
    res.status(statusCode.INTERNAL_ERROR).send(err.message || ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.viewPO = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const { po, tender } = await poService.getPOData(tenderId);

    return res.render('profile/viewPO', {
      layout: LAYOUTS.USER_LAYOUT,
      po,
      tender,
      vendor: po.vendorId,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send(err.message || ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.getUploadPage = async (req, res) => {
  const tenderId = req.params.id;

  return res.render('profile/draftAgreement', {
    layout: LAYOUTS.USER_LAYOUT,
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

    if (err.message === ERROR_MESSAGES.NO_FILE)
      return res.status(statusCode.BAD_REQUEST).send(ERROR_MESSAGES.NO_FILE_UPLOADED);

    if (err.message === ERROR_MESSAGES.WINNER_NOT_FOUND)
      return res.status(statusCode.BAD_REQUEST).send(ERROR_MESSAGES.WINNER_NOT_FOUND);

    return res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.UPLOAD_FAILED);
  }
};

exports.view = async (req, res) => {
  try {
    const filePath = await postAwardService.viewAgreementFile(req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    return res.sendFile(filePath);
  } catch (err) {
    console.error(err.message);

    if (err.message === ERROR_MESSAGES.FILE_NOT_FOUND)
      return res.status(statusCode.NOT_FOUND).send(ERROR_MESSAGES.FILE_NOT_FOUND);

    return res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.UNABLE_OPEN_FILE);
  }
};

exports.approveAgreement = async (req, res) => {
  try {
    const agreement = await postAwardService.approveAgreement(req.params.agreementId);

    return res.redirect(`/publisher/tender/${agreement.tenderId}/post-award?agreement=approved`);
  } catch (err) {
    console.error(err.message);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.APPROVAL_FAILED);
  }
};

exports.rejectAgreement = async (req, res) => {
  try {
    const agreement = await postAwardService.rejectAgreement({
      agreementId: req.params.agreementId,
      remarks: req.body.remarks,
    });

    return res.redirect(`/publisher/tender/${agreement.tenderId}/post-award?agreement=rejected`);
  } catch (err) {
    console.error(err.message);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.REJECT_FAILED);
  }
};

exports.issuePage = async (req, res) => {
  try {
    const { tenderId } = req.params;

    const data = await postAwardService.getIssuePageData(req.user._id, tenderId);

    res.render('profile/workOrder', {
      layout: LAYOUTS.USER_LAYOUT,
      tender: data.tender,
      vendor: data.vendor,
      contractRef: data.contractRef,
    });
  } catch (err) {
    console.log('Issue page error:', err);
    res
      .status(statusCode.NOT_FOUND)
      .render(VIEWS.ERROR, { layout: LAYOUTS.USER_LAYOUT, message: err.message });
  }
};

exports.issueWorkOrder = async (req, res) => {
  try {
    const { tenderId } = req.params;

    await postAwardService.issueWorkOrder(req.user._id, tenderId, req.body, req.file);

    res.redirect(`/publisher/tender/${tenderId}/post-award`);
  } catch (err) {
    console.error('Issue work order error:', err.message);
    res.status(statusCode.BAD_REQUEST).send(err.message || ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.view = async (req, res) => {
  try {
    console.log('PARAM ID:', req.params.id);
    const filePath = await postAwardService.getWorkOrderFilePath(req.user._id, req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
  } catch (err) {
    console.error('View work order error:', err.message);
    res.status(statusCode.NOT_FOUND).send(ERROR_MESSAGES.WORK_ORDER_NOT_FOUND);
  }
};
