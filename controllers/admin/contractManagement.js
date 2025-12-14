const contractService = require('../../services/admin/contractManagement');
const File = require('../../models/File');
const path = require('path')

exports.contractManagementPage = async (req, res) => {
  const tab = req.query.tab || "tender";

  const { summary, contracts } =
    await contractService.getContractManagementData(null, tab, true);

  res.render("admin/contractManagement", {
    layout: "layouts/admin/adminLayout",
    user: req.admin,
    activeTab: tab,
    summary,
    contracts,
    currentPage: "contract-management"
  });
};

exports.getContractDetails = async (req, res) => {
    console.log("🟡 HIT getContractDetails");
  console.log("🟡 tenderId:", req.params.tenderId);
  console.log("🟡 admin:", req.admin?._id);
  try {
    const tenderId = req.params.tenderId;

    const data = await contractService.getContractDetails(
      req.admin._id,
      tenderId
    );

    return res.json(data);
  } catch (err) {
    console.error("Contract detail error:", err.message);
    return res.status(404).json({
      message: "Contract not found"
    });
  }
};

exports.view = async (req, res) => {
  const { id } = req.params;

  if (!id || id === "undefined") {
    return res.status(400).send("Invalid file id");
  }

  const file = await File.findById(id);
  if (!file) return res.status(404).send("File not found");

  const absolutePath = path.join(
    process.cwd(),
    file.fileUrl.replace("/uploads", "uploads")
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline");
  res.sendFile(absolutePath);
};