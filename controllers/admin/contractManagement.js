const contractService = require('../../services/admin/contractManagement');
const statusCode = require('../../utils/statusCode');
const { VIEWS, LAYOUTS, ERROR_MESSAGES, TITLES } = require('../../utils/constants');
exports.contractManagementPage = async (req, res) => {
  const tab = req.query.tab || 'tender';
  const page = parseInt(req.query.page) || 1;
  const limit = 10; // Items per page

  const { summary, contracts, pagination } = await contractService.getContractManagementData(
    null,
    tab,
    true,
    page,
    limit
  );

  res.render(VIEWS.ADMIN_CONTRACT_MANAGEMENT, {
    layout: LAYOUTS.ADMIN_LAYOUT,
    title: TITLES.CONTRACT_MANAGEMENT,
    user: req.admin,
    activeTab: tab,
    summary,
    contracts,
    currentPage: 'contract-management',
    totalPages: pagination.totalPages,
  });
};
exports.getContractDetails = async (req, res) => {
  try {
    const { tenderId } = req.params;
    const data = await contractService.getContractDetails(req.admin._id, tenderId);
    return res.json(data);
  } catch (err) {
    console.error('Contract detail error:', err.message);
    return res.status(statusCode.NOT_FOUND).json({
      message: ERROR_MESSAGES.CONTRACT_NOT_FOUND,
    });
  }
};
exports.view = async (req, res) => {
  try {
    const { id } = req.params;
    const fileUrl = await contractService.getFileUrl(id);
    return res.redirect(fileUrl);
  } catch (err) {
    return res.status(statusCode.NOT_FOUND).render(VIEWS.ERROR, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      message: err.message,
    });
  }
};
