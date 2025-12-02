const Property = require("../../models/property");

exports.getProperties = async (page = 1) => {
  const limit = 8;

  // Since no search: fetch all properties
  const query = {};  

  // Fetch paginated data
  const properties = await Property.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await Property.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  return {
    properties,
    pagination: {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

exports.getPropertyDetails = async (id) => {
  try {
    const property = await Property.findById(id).lean();
    return property; // ✅ must return
  } catch (err) {
    throw err; // ❌ do not use res inside service
  }
};