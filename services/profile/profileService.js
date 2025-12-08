
const vendorApplication = require("../../models/vendorApplication");
const Property = require("../../models/property");
const Tender = require("../../models/tender");

exports.userStatus = async (userId) => {
 
  const vendorApp = await vendorApplication
    .findOne({ userId })
    .populate("documents.fileId")
    .populate("ocrResultId");

const query = { sellerId: userId, deletedAt: null };
  const userProperties = await Property.find(query)
    .sort({ createdAt: -1 })
    .lean();


  let propertyStatus = "No Properties Submitted";

  if (userProperties.length > 0) {
    const latest = userProperties[0];

    propertyStatus = latest.verificationStatus === "submitted"
      ? "Pending Review"
      : latest.verificationStatus === "approved"
      ? "Approved"
      : latest.verificationStatus === "rejected"
      ? "Rejected"
      : "Unknown";
  }

  const tenderQuery = { createdBy: userId }; // CHANGE IF USING different field
  const userTenders = await Tender.find(tenderQuery)
    .sort({ createdAt: -1 })
    .lean();

  let tenderStatus = "No Tender Activity";
  let latestTender = null;

  if (userTenders.length > 0) {
    latestTender = userTenders[0];

    switch (latestTender.status) {
      case "draft":
        tenderStatus = "Draft (Pending Admin Approval)";
        break;
      case "submitted":
        tenderStatus = "Pending Admin Review";
        break;
      case "published":
        tenderStatus = "Live (Published)";
        break;
      case "rejected":
        tenderStatus = "Rejected by Admin";
        break;
      case "closed":
        tenderStatus = "Closed";
        break;
      case "awarded":
        tenderStatus = "Awarded";
        break;
      default:
        tenderStatus = "Unknown Status";
    }
  }

  // RETURN ALL INFO
  return {
    vendorApp,
    propertyStatus,
    tenderStatus,
    latestTender,
    userProperties,
    userTenders
  };
};
