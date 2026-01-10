const tenderService = require('../../services/tender/tender');
const statusCode = require('../../utils/statusCode');

const {
  VIEWS,
  LAYOUTS,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  ERROR_CODES,
  DEFAULTS,
} = require('../../utils/constants');

exports.getTenderListingPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || DEFAULTS.PAGE;

    const { tenders, pagination } = await tenderService.getAllTenders(page);

    res.render(VIEWS.TENDER_LISTING, {
      layout: LAYOUTS.USER_LAYOUT,
      tenders,
      pagination,
      user: req.user,
      isVendor: req.user?.isVendor || false,
    });
  } catch (err) {
    console.error('Tender list error:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
      user: req.user,
    });
  }
};

exports.getTenderDetailsPage = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const user = req.user || null;

    const { tender, isVendor, canViewFull } = await tenderService.getTenderDetailsForUser(
      tenderId,
      user
    );

    const isOwner =
      user && tender.createdBy && tender.createdBy._id.toString() === user._id.toString();

    const canParticipate = isVendor && !isOwner;

    return res.render(VIEWS.TENDER_DETAILS, {
      layout: LAYOUTS.USER_LAYOUT,
      title: tender.title,
      tender,
      user,
      isVendor,
      canParticipate,
      canViewFull,
      userId: req.user._id,
      isOwner,
    });
  } catch (err) {
    console.error('Tender Details Error:', err);

    if (err.code === ERROR_CODES.TENDER_DRAFT || err.statusCode === statusCode.FORBIDDEN) {
      return res.status(statusCode.FORBIDDEN).render(VIEWS.ERROR, {
        layout: LAYOUTS.USER_LAYOUT,
        message: ERROR_MESSAGES.TENDER_RESTRICTED,
      });
    }

    const httpStatus = err.statusCode || statusCode.INTERNAL_SERVER_ERROR;
    return res.status(httpStatus).render(VIEWS.ERROR, {
      layout: LAYOUTS.USER_LAYOUT,
      message: err.message || ERROR_MESSAGES.GENERIC_ERROR,
    });
  }
};

exports.resubmitTender = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const { body } = req;
    const uploadedFiles = req.files || [];
    const updatedTender = await tenderService.resubmitTenderService(tenderId, body, uploadedFiles);

    return res.json({
      success: true,
      message: SUCCESS_MESSAGES.TENDER_RESUBMITTED,
      tenderId: updatedTender._id,
    });
  } catch (err) {
    return res.status(err.statusCode || statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
