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
    console.log('status', result.po);
    res.render(VIEWS.PROFILE_POST_AWARD, {
      layout: LAYOUTS.USER_LAYOUT,
      ...result,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    return res.status(statusCode.INTERNAL_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};
