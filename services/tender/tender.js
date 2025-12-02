const Tender = require("../../models/tender");

exports.getAllTenders = async (page = 1) => {
  const limit = 8; // tenders per page
  const skip = (page - 1) * limit;

  // Fetch tenders (only published)
  const tenders = await Tender.find({ status: "published" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Pagination data
  const total = await Tender.countDocuments({ status: "published" });
  const totalPages = Math.ceil(total / limit);

  return {
    tenders,
    pagination: {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

exports.getTenderDetails = async (id) => {
  try {
    const tender = await Tender.findById(id).lean();
    return tender;
  } catch (err) {
    throw err;
  }
};