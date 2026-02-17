const Property = require('../../models/property');
const Tender = require('../../models/tender');
exports.getMyListings = async (userId, pPage = 1, tPage = 1, limit = 10) => {
  const pSkip = (pPage - 1) * limit;
  const tSkip = (tPage - 1) * limit;

  const pQuery = { sellerId: userId, deletedAt: null };
  const tQuery = { createdBy: userId };

  const [pTotal, tTotal, properties, tenders] = await Promise.all([
    Property.countDocuments(pQuery),
    Tender.countDocuments(tQuery),
    Property.find(pQuery).sort({ createdAt: -1 }).skip(pSkip).limit(limit).lean(),
    Tender.find(tQuery).sort({ createdAt: -1 }).skip(tSkip).limit(limit).lean(),
  ]);

  return {
    properties,
    tenders,
    paginationP: {
      total: pTotal,
      totalPages: Math.ceil(pTotal / limit),
      currentPage: parseInt(pPage),
      hasNextPage: pPage * limit < pTotal,
      hasPrevPage: pPage > 1,
    },
    paginationT: {
      total: tTotal,
      totalPages: Math.ceil(tTotal / limit),
      currentPage: parseInt(tPage),
      hasNextPage: tPage * limit < tTotal,
      hasPrevPage: tPage > 1,
    },
  };
};
