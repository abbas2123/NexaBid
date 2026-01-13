const Property = require('../../models/property');
const Tender = require('../../models/tender');
exports.getMyListings = async (userId) => {
  const [properties, tenders] = await Promise.all([
    Property.find({
      sellerId: userId,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean(),
    Tender.find({ createdBy: userId }).sort({ createdAt: -1 }).lean(),
  ]);

  return {
    properties,
    tenders,
  };
};
