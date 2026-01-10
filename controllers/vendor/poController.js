const poService = require('../../services/vendor/poService');
const postAwardService = require('../../services/vendor/postAward');
const statusCode = require('../../utils/statusCode');
const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');
const Tender = require('../../models/tender');
const TenderBid = require('../../models/tenderBid');

exports.showCreatePOPage = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const userId = req.user._id;

    const { tender, vendor, amount } = await postAwardService.getCreatePOPageData(tenderId, userId);

    return res.render(VIEWS.CREATE_PO, {
      layout: LAYOUTS.USER_LAYOUT,
      tender,
      user: req.user,
      showSuccessModal: false,
      poNumber: null,
      vendor,
      amount,
    });
  } catch (err) {
    console.log(err);
    const status = err.statusCode || statusCode.INTERNAL_ERROR;
    res.status(status).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: err.message || ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};

exports.createPO = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const po = await poService.createPO({
      tenderId,
      publisher: req.user,
      form: req.body,
      io: req.app.get('io'),
    });

    const winnerBid = await TenderBid.findOne({
      tenderId,
      isWinner: true,
    }).populate('vendorId');

    const vendor = winnerBid.vendorId;

    return res.render(VIEWS.CREATE_PO, {
      layout: LAYOUTS.USER_LAYOUT,
      tender: await Tender.findById(tenderId),
      user: req.user,
      showSuccessModal: true,
      poNumber: po.poNumber,
      fileUrl: po.pdfFile,
      vendor,
      amount: winnerBid.quotes.amount,
    });
  } catch (err) {
    console.error(err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: err.message,
      user: req.user,
    });
  }
};

exports.viewPO = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const { po, tender } = await poService.getPOData(tenderId);

    return res.render(VIEWS.VIEW_PO, {
      layout: LAYOUTS.USER_LAYOUT,
      po,
      tender,
      vendor: po.vendorId,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: err.message || ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};

exports.issuePage = async (req, res) => {
  try {
    const tenderId = req.params.id;
    console.log(`[DEBUG] Issue Page Request - TenderId: ${tenderId}, User: ${req.user._id}`);

    const data = await postAwardService.getIssuePageData(req.user._id, tenderId);

    res.render(VIEWS.WORK_ORDER, {
      layout: LAYOUTS.USER_LAYOUT,
      tender: data.tender,
      vendor: data.vendor,
      contractRef: data.contractRef,
      amount: data.amount,
    });
  } catch (err) {
    console.error('Issue page error:', err);
    res
      .status(statusCode.NOT_FOUND)
      .render(VIEWS.ERROR, { layout: LAYOUTS.USER_LAYOUT, message: err.message });
  }
};

exports.issueWorkOrder = async (req, res) => {
  try {
    const { tenderId } = req.params;

    const wo = await postAwardService.issueWorkOrder(req.user._id, tenderId, req.body, req.file);

    return res.redirect(`/vendor/work-order/tracking/${wo._id}`);
  } catch (err) {
    console.error('Issue work order error:', err.message);
    res.status(statusCode.BAD_REQUEST).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: err.message || ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};
