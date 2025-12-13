const tenderService = require("../../services/tender/tender");
exports.getTenderListingPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    const { tenders, pagination } =
      await tenderService.getAllTenders(page);

    res.render("user/tender", {
      layout: "layouts/user/userLayout",
      tenders,
      pagination,
      user: req.user,
      isVendor: req.user?.isVendor || false
    });

  } catch (err) {
    console.error("Tender list error:", err);
    res.status(500).send("Server Error");
  }
};

exports.getTenderDetailsPage = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const user = req.user || null;

    const { tender, isVendor, canViewFull } =
      await tenderService.getTenderDetailsForUser(tenderId, user);

          const isOwner =
      user &&
      tender.createdBy &&
      tender.createdBy._id.toString() === user._id.toString();

// If owner → force isVendor = false
const canParticipate = isVendor && !isOwner;


    return res.render("user/tenderDetails", {
      layout: "layouts/user/userLayout",
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
    console.error("Tender Details Error:", err);

    // Special handling for draft / restricted
    if (err.code === "TENDER_DRAFT" || err.statusCode === 403) {
      return res.status(statusCode.FORBIDDEN).render("error", {
        layout: "layouts/user/userLayout",
        message: "This tender is not yet published or visible to you.",
      });
    }

    const httpStatus = err.statusCode || statusCode.INTERNAL_ERROR;
    return res.status(httpStatus).render("error", {
      layout: "layouts/user/userLayout",
      message: err.message || "Something went wrong",
    });
  }
};

exports.resubmitTender = async (req, res) => {
  try {
    const tenderId = req.params.id;
    const body = req.body;
    const uploadedFiles = req.files || [];

    const updatedTender = await tenderService.resubmitTenderService(
      tenderId,
      body,
      uploadedFiles
    );

    return res.json({
      success: true,
      message: "Tender re-submitted successfully 🎉",
      tenderId: updatedTender._id
    });

  } catch (err) {
    console.log("Resubmission failed:", err);

    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};