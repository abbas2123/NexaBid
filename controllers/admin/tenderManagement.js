const statusCode = require('../../utils/statusCode');
const {
  VIEWS,
  LAYOUTS,
  ERROR_MESSAGES,
  TENDER_STATUS,
  SUCCESS_MESSAGES,
} = require('../../utils/constants');
const TenderService = require('../../services/admin/tenderManagement');
exports.getAdminTenderPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const filters = {
      status: req.query.status || '',
      search: req.query.search || '',
    };
    const { tenders, pagination } = await TenderService.getAllTenders(page, filters);
    return res.render(VIEWS.ADMIN_TENDER_MANAGEMENT, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      title: 'Tender Management',
      tenders,
      pagination,
      applied: filters,
      currentPage: 'tender-management',
    });
  } catch (err) {
    console.error('Admin Tender Management error:', err);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      message: ERROR_MESSAGES.LOAD_TENDERS_FAILED,
    });
  }
};
exports.getTenderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const tender = await TenderService.getTenderById(id);
    if (!tender) {
      return res
        .status(statusCode.NOT_FOUND)
        .json({ success: false, message: ERROR_MESSAGES.TENDER_NOT_FOUND });
    }
    return res.json({
      success: true,
      tender,
    });
  } catch (error) {
    console.error('Tender fetch error', error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
exports.updateTenderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const allowedStatuses = Object.values(TENDER_STATUS);
    if (!allowedStatuses.includes(status)) {
      return res.status(statusCode.BAD_REQUEST).json({
        success: false,
        message: `${ERROR_MESSAGES.INVALID_STATUS}: ${status}`,
      });
    }
    const io = req.app.get('io');
    const tender = await TenderService.updateTenderStatus(id, status, comment, io);
    if (!tender) {
      return res.status(statusCode.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.TENDER_NOT_FOUND,
      });
    }
    return res.json({
      success: true,
      message: `${SUCCESS_MESSAGES.STATUS_UPDATED} to ${status}`,
    });
  } catch (error) {
    console.error('Tender status update error:', error);
    return res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
exports.toggleBlockTender = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked, blockingReason } = req.body;
    const tender = await TenderService.toggleIsBlocked(id, isBlocked, blockingReason);
    return res.json({
      success: true,
      message: `Tender ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
    });
  } catch (err) {
    console.error('Tender block error:', err);
    return res.json({ success: false, message: err.message });
  }
};
