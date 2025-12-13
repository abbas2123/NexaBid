
const vendorApplication = require("../../models/vendorApplication");
const Property = require("../../models/property");
const Tender = require("../../models/tender");
const TenderBid = require("../../models/tenderBid");
const PurchaseOrder = require("../../models/purchaseOrder");
const Agreement = require("../../models/agreement");
const WorkOrder = require("../../models/workOrder");
const PropertyBid = require('../../models/propertyBid');
const File = require("../../models/File");




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

  
  return {
    vendorApp,
    propertyStatus,
    tenderStatus,
    latestTender,
    userProperties,
    userTenders
  };
};

exports.getMyParticipationData = async (userId) => {

  const propertyBids = await PropertyBid.find({ bidderId: userId })
    .populate("propertyId")
    .lean();

  const properties = propertyBids
    .map(bid => {
      if (!bid.propertyId) return null;

      return {
        _id: bid.propertyId._id,
        title: bid.propertyId.title,
        myBid: bid.amount,
        currentStatus: bid.status,
        winStatus: bid.isWinner ? "Winner" : bid.isWinner === false ? "Lost" : "Pending",
        projectStatus: bid.projectStatus || "—",
        closingDate: bid.propertyId.endDate
          ? new Date(bid.propertyId.endDate).toLocaleDateString("en-IN")
          : "—",
      };
    })
    .filter(Boolean);

  const tenderBids = await TenderBid.find({ vendorId: userId })
    .populate("tenderId")
    .lean();

  const tenders = tenderBids
    .map(bid => {
      if (!bid.tenderId) return null;

      return {
        _id: bid.tenderId._id,
        title: bid.tenderId.title,
        myOffer: bid.quotes?.amount || 0,
        currentStatus:
          bid.finReviewStatus === "accepted"
            ? "Awarded"
            : bid.finReviewStatus === "rejected"
              ? "Closed"
              : "Under Review",
        winStatus:
          bid.isWinner ? "Winner"
          : bid.finReviewStatus === "rejected" ? "Lost" : "Pending",
      };
    })
    .filter(Boolean);

  return { properties, tenders };
};

exports.getVendorPostAwardData = async (tenderId, userId) => {
  
  const tender = await Tender.findById(tenderId);
  if (!tender) {
    throw new Error("TENDER_NOT_FOUND");
  }

  
  const bid = await TenderBid.findOne({
    tenderId,
    vendorId: userId,
  });

  if (!bid) {
    throw new Error("NOT_PARTICIPATED");
  }

 
  if (!bid.isWinner) {
    return {
      loseView: true,
      tender,
      bid,
    };
  }

  
  const po = await PurchaseOrder.findOne({ tenderId }).populate("pdfFile");

  const agreement = await Agreement.findOne({ tenderId })
    .populate("publisherAgreement")
    .populate("uploadedByVendor");

  const workOrder = await WorkOrder.findOne({ tenderId }).populate("file");

  
  const redirectToAgreementUpload =
    po && po.status === "vendor_accepted";

  return {
    loseView: false,
    redirectToAgreementUpload,
    tender,
    bid,
    po,
    agreement,
    workOrder,
  };
};


exports.respondToPO = async ({ poId, action, reason }) => {
  const po = await PurchaseOrder.findById(poId).populate("tenderId");

  if (!po) {
    throw new Error("PO_NOT_FOUND");
  }

  const tenderId = po.tenderId._id;

  if (action === "accept") {
    po.status = "vendor_accepted";
    await po.save();

    return {
      tenderId,
      response: "accept",
    };
  }

  if (action === "reject") {
    po.status = "vendor_rejected";
    po.rejectionReason = reason || "";
    await po.save();

    return {
      tenderId,
      response: "reject",
    };
  }

  throw new Error("INVALID_ACTION");
};


exports.getAgreementUploadData = async (tenderId) => {
  const agreement = await Agreement.findOne({ tenderId }).populate(
    "publisherAgreement"
  );

  return {
    publisherAgreement: agreement?.publisherAgreement || null,
  };
};


exports.uploadVendorAgreement = async ({
  tenderId,
  vendorId,
  file,
}) => {
  if (!file) {
    throw new Error("NO_FILE");
  }

  const fileData = await File.create({
    fileName: file.filename,
    originalName: file.originalname,
    fileUrl: `/uploads/agreement/${file.filename}`,
    uploadedBy: vendorId,
  });

  let agreement = await Agreement.findOne({ tenderId });

  if (!agreement) {
    agreement = await Agreement.create({
      tenderId,
      vendorId,
      uploadedByVendor: fileData._id,
    });
  } else {
    agreement.uploadedByVendor = fileData._id;
    await agreement.save();
  }

  return true;
};