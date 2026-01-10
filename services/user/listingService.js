


const Property = require('../../models/property');
const Tender = require('../../models/tender');

exports.getMyListings = async (userId) => {
  const properties = await Property.find({
    sellerId: userId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();

  const tenders = await Tender.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();

  return {
    properties,
    tenders,
  };
};
