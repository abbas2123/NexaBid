const tenderCreationService = require('../../services/tender/tenderCreation');
const statusCode = require('../../utils/statusCode');

const {
  LAYOUTS,
  VIEWS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  TITLES,
} = require('../../utils/constants');

exports.getCreateTenderPage = async (req, res) => {
  try {
    res.render(VIEWS.TENDER_CREATE, {
      layout: LAYOUTS.USER_LAYOUT,
      title: TITLES.CREATE_TENDER,
      user: req.user,
      tender: null,
      files: [],
    });
  } catch (error) {
    console.error('Create Tender Page Error:', error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.ERROR_LOADING_TENDER_PAGE,
    });
  }
};
exports.createTenderController = async (req, res) => {
  try {
    const tender = await tenderCreationService.creatTenderService(
      req.user,
      req.body,
      req.files || []
    );

    return res.status(statusCode.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.TENDER_CREATED,
      tenderId: tender._id,
    });
  } catch (err) {
    console.error('Tender creation error:', err);
    return res.status(statusCode.BAD_REQUEST).json({
      success: false,
      message: err.message,
    });
  }
};
