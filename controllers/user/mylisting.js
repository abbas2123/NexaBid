const statusCode = require('../../utils/statusCode');
const service = require('../../services/tender/tenderEvaluationService');
const { LAYOUTS, ERROR_MESSAGES } = require('../../utils/constants');

exports.getTenderEvaluationPage = async (req, res) => {
  try {
    const tenderId = req.params.id;

    const { tender, bids } = await service.getEvaluationData(tenderId, req.user._id);
    if (tender.status === 'awarded') {
      return res.redirect(`/publisher/tender/${tenderId}/post-award`);
    }
    return res.render('profile/tenderEvaluation', {
      layout: LAYOUTS.USER_LAYOUT,
      tender,
      bids,
      user: req.user,
    });
  } catch (err) {
    console.log(err);

    if (err.message === ERROR_MESSAGES.UNAUTHORIZED)
      return res.status(statusCode.FORBIDDEN).send(ERROR_MESSAGES.UNAUTHORIZED);

    if (err.message === ERROR_MESSAGES.TENDER_NOT_FOUND)
      return res.status(statusCode.NOT_FOUND).send(ERROR_MESSAGES.TENDER_NOT_FOUND);

    return res.status(statusCode.INTERNAL_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.acceptTechnicalEvaluation = async (req, res) => {
  try {
    const tenderId = await service.acceptTechnical(req.params.bidId);

    return res.redirect(`/user/status/my-listing/owner/tender/${tenderId}/evaluation`);
  } catch (err) {
    console.log(err);
    return res.status(statusCode.INTERNAL_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.rejectTechnicalEvaluation = async (req, res) => {
  try {
    const tenderId = await service.rejectTechnical(req.params.bidId);

    return res.redirect(`/user/status/my-listing/owner/tender/${tenderId}/evaluation`);
  } catch (err) {
    console.log(err);
    return res.status(statusCode.INTERNAL_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.selectWinner = async (req, res) => {
  try {
    const tenderId = await service.selectWinner(req.params.bidId, req.app.get('io'));

    return res.redirect(`/user/status/my-listing/owner/tender/${tenderId}/evaluation`);
  } catch (err) {
    console.log(err);
    return res.status(statusCode.INTERNAL_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};
