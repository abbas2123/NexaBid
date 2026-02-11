const statusCode = require('../../utils/statusCode');
const tenderBidService = require('../../services/tender/tenderBid');
const { LAYOUTS, VIEWS, ERROR_MESSAGES } = require('../../utils/constants');
exports.getTenderTechBidForm = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const result = await tenderBidService.getTechBidData(tenderId, req.user);

    if (result.redirect) {
      return res.redirect(result.redirect);
    }

    return res.render('vendor/tenderTech', {
      layout: LAYOUTS.USER_LAYOUT,
      title: 'Tender - TechForm Submission',
      user: req.user,
      vendor: req.user,
      tender: result.tender,
      tenderId,
      paymentUrl: `/vendor/payment/initiate/${tenderId}`,
      paymentStatus: result.payments.paymentStatus,
      bid: result.bid,
    });
  } catch (err) {
    console.error(err);
    if (err.message === ERROR_MESSAGES.NOT_VENDOR)
      return res.status(statusCode.FORBIDDEN).send(ERROR_MESSAGES.NOT_A_VENDOR);
    return res.status(statusCode.INTERNAL_ERROR).send(err.message || ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.uploadTechnicalPhase = async (req, res) => {
  try {
    const tenderId = req.params.id;
    await tenderBidService.uploadTechnical(tenderId, req.user._id, req.files);
    return res.redirect(`/vendor/tender/${tenderId}/bid?uploaded=true`);
  } catch (err) {
    console.error(err);
    const tenderId = req.params.id;
    if (err.message === ERROR_MESSAGES.ALREADY_UPLOADED) {
      return res.redirect(`/vendor/tender/${tenderId}/bid?alreadyUploaded=true`);
    }
    return res.redirect(`/vendor/tender/${tenderId}/bid?uploaded=false`);
  }
};

exports.uploadFinancialPhase = async (req, res) => {
  try {
    const tenderId = req.params.id;
    await tenderBidService.uploadFinancial(tenderId, req.user._id, req.files, req.body.amount);
    return res.redirect(`/vendor/tender/${tenderId}/financial?uploaded=true`);
  } catch (err) {
    console.error(err);
    const tenderId = req.params.id;
    if (err.message === ERROR_MESSAGES.ALREADY_UPLOADED) {
      return res.redirect(`/vendor/tender/${tenderId}/financial?alreadyUploaded=true`);
    }
    return res.status(statusCode.INTERNAL_ERROR).send(err.message || ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.getTenderFin = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const result = await tenderBidService.getFinancialBidData(tenderId, req.user._id);

    if (result.redirect) {
      return res.redirect(result.redirect);
    }
    if (result.errorRedirect) {
      return res.redirect(result.errorRedirect);
    }

    return res.render('vendor/tenderFin', {
      layout: LAYOUTS.USER_LAYOUT,
      tender: result.tender,
      tenderId,
      bid: result.bid,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    return res.status(statusCode.INTERNAL_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: err.message,
    });
  }
};
