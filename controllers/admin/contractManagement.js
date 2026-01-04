const path = require('path');
const contractService = require('../../services/admin/contractManagement');
const File = require('../../models/File');
const statusCode = require('../../utils/statusCode');
const { VIEWS, LAYOUTS, ERROR_MESSAGES } = require('../../utils/constants');

exports.contractManagementPage = async (req, res) => {
  const tab = req.query.tab || 'tender';

  const { summary, contracts } = await contractService.getContractManagementData(null, tab, true);

  res.render(VIEWS.ADMIN_CONTRACT_MANAGEMENT, {
    layout: LAYOUTS.ADMIN_LAYOUT,
    user: req.admin,
    activeTab: tab,
    summary,
    contracts,
    currentPage: 'contract-management',
  });
};

exports.getContractDetails = async (req, res) => {
  console.log('🟡 HIT getContractDetails');
  console.log('🟡 tenderId:', req.params.tenderId);
  console.log('🟡 admin:', req.admin?._id);
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
  const { id } = req.params;

  if (!id || id === 'undefined') {
    return res.status(statusCode.BAD_REQUEST).send(ERROR_MESSAGES.INVALID_FILE_ID);
  }

  const file = await File.findById(id);
  if (!file) return res.status(statusCode.NOT_FOUND).send(ERROR_MESSAGES.FILE_NOT_FOUND);

  const absolutePath = path.join(process.cwd(), file.fileUrl.replace('/uploads', 'uploads'));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  res.sendFile(absolutePath);
};
