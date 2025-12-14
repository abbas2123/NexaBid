const Property = require("../../models/property");
const statusCode = require('../../utils/statusCode');



exports.getProperties = async (page = 1, filters = {}) => {
  const limit = 8;

  const query = {
    status: "published",
    verificationStatus: "approved",
    deletedAt:null
  };

  // TYPE FILTER
  if (filters.type) {
    query.type = filters.type;
  }

  // DISTRICT FILTER
  if (filters.district) {
    query.locationDistrict = { $regex: filters.district, $options: "i" };
  }

  // PRICE FILTER
  if (filters.minPrice || filters.maxPrice) {
    query.$or = [
      {
        buyNowPrice: {
          ...(filters.minPrice ? { $gte: filters.minPrice } : {}),
          ...(filters.maxPrice ? { $lte: filters.maxPrice } : {}),
        }
      },
      {
        basePrice: {
          ...(filters.minPrice ? { $gte: filters.minPrice } : {}),
          ...(filters.maxPrice ? { $lte: filters.maxPrice } : {}),
        }
      }
    ];
  }

  const total = await Property.countDocuments(query);

  const properties = await Property.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

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
exports.getPropertyDetails = async (propertyId, user) => {
  const property = await Property.findById(propertyId)
    .populate("soldTo", "name email phone")
    .populate("currentHighestBidder", "name email")
    .lean();

  if (!property) return null;

  // If property is NOT approved
  if (property.verificationStatus !== "approved") {

    // allow ONLY owner OR admin
    if (property.sellerId.toString() !== user._id.toString() && user.role !== "admin") {
      return null;
    }
  }

  return property;
};


const normalize = (value = "") =>
  value.toLowerCase().trim().replace(/\s+/g, " ");

exports.createProperty = async ({ data, mediaFiles = [], docFiles = [] }) => {
  // Normalize strings
  const normTitle = normalize(data.title);
  const normAddress = normalize(data.address);
  const normType = normalize(data.type);

  // 🔍 Global duplicate check
  const existing = await Property.findOne({
    title: normTitle,
    address: normAddress,
    type: normType,
    geoLat: data.geoLat,
    geoLng: data.geoLng,
    deletedAt: null,
  });

  if (existing) {
    const err = new Error("A similar property already exists in the system.");
    err.statusCode = statusCode.CONFLICT;
    throw err;
  }

  const media = mediaFiles.map((file) => ({
    url: "/uploads/property-media/" + file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
  }));

  const docs = docFiles.map((file) => ({
    url: "/uploads/property-docs/" + file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
  }));

  const property = await Property.create({
    sellerId: data.sellerId,
    title: normTitle,
    description: data.description,
    type: normType,

    address: normAddress,
    locationState: data.locationState,
    locationDistrict: data.locationDistrict,

    geoLat: data.geoLat,
    geoLng: data.geoLng,

    basePrice: data.basePrice,
    buyNowPrice: data.buyNowPrice,

    isAuction: data.isAuction,
    auctionStartsAt: data.auctionStartsAt,
    auctionEndsAt: data.auctionEndsAt,
    auctionStep: data.auctionStep,
    auctionReservePrice: data.auctionReservePrice,
    auctionAutoExtendMins: data.auctionAutoExtendMins,
    auctionLastBidWindowMins: data.auctionLastBidWindowMins,

    bhk: data.bhk,
    size: data.size,

    media,
    docs,

    status: "draft",
    verificationStatus: "submitted",
    verificationRequestedAt: new Date(),
  });

  return property;
};

exports.updatePropertyService = async (propertyId, userId, body, files) => {
  // find property owned by logged user
  const existingProperty = await Property.findOne({
    _id: propertyId,
    sellerId: userId,
  });

  if (!existingProperty) {
    const error = new Error("Property not found");
    error.statusCode = statusCode.NOT_FOUND;
    throw error;
  }
console.log('wefwe',body.auctionStartsAt);
console.log('wefwe',body.auctionEndsAt)
  // update base fields
  existingProperty.title = body.title;
  existingProperty.description = body.description;
  existingProperty.type = body.type;
  existingProperty.address = body.address;
  existingProperty.bhk = body.bhk;
  existingProperty.size = body.size;
  existingProperty.locationState = body.locationState;
  existingProperty.locationDistrict = body.locationDistrict;
  existingProperty.geoLat = body.geoLat;
  existingProperty.geoLng = body.geoLng;

  existingProperty.isAuction = body.isAuction === "true";

  if (existingProperty.isAuction) {
    existingProperty.basePrice = body.basePrice;
    existingProperty.auctionStartsAt = body.auctionStartsAt;
    existingProperty.auctionEndsAt = body.auctionEndsAt;
    existingProperty.auctionStep = body.auctionStep;
    existingProperty.auctionReservePrice = body.auctionReservePrice;
    existingProperty.auctionAutoExtendMins = body.auctionAutoExtendMins;
    existingProperty.auctionLastBidWindowMins = body.auctionLastBidWindowMins;
    existingProperty.buyNowPrice = null;
  } else {
    existingProperty.buyNowPrice = body.buyNowPrice;
    existingProperty.basePrice = null;
    existingProperty.auctionStartsAt = null;
    existingProperty.auctionEndsAt = null;
    existingProperty.auctionStep = null;
    existingProperty.auctionReservePrice = null;
    existingProperty.auctionAutoExtendMins = null;
    existingProperty.auctionLastBidWindowMins = null;
  }

  // media update
  if (files?.media?.length > 0) {
    const newMedia = files.media.map(file => ({
      url: `/uploads/property-media/${file.filename}`,
      fileName: file.filename
    }));

    existingProperty.media.push(...newMedia);
  }

  // document update
  if (files?.docs?.length > 0) {
    const newDocs = files.docs.map(file => ({
      url: `/uploads/property-docs/${file.filename}`,
      fileName: file.filename
    }));

    existingProperty.docs.push(...newDocs);
  }

  // status changes
  existingProperty.verificationStatus = "submitted";
  existingProperty.rejectionMessage = null;

  await existingProperty.save();

  return existingProperty;
};


exports.getPropertyForEdit = async (propertyId) => {
  const property = await Property.findById(propertyId).lean();

  if (!property) {
    const err = new Error("Property not found");
    err.statusCode = 404;
    throw err;
  }

  return {
    property,
    media: property.media || [],
    docs: property.docs || [],
  };
};

exports.getSinglePropertyOwnedByUser = async (propertyId, userId) => {
  const property = await Property.findOne({
    _id: propertyId,
    sellerId: userId,
    deletedAt: null, 
  }).lean();

  if (!property) {
    const err = new Error("Property not found");
    err.statusCode = 404;
    throw err;
  }

  return property;
};

exports.deleteUserProperty = async (propertyId, userId) => {
  const deletedProperty = await Property.findOneAndUpdate(
    { _id: propertyId, sellerId: userId },
    { deletedAt: new Date() },
    { new: true }
  );

  if (!deletedProperty) {
    const err = new Error("Property not found");
    err.statusCode = 404;
    throw err;
  }

  return deletedProperty;
};

exports.deleteUserPropertyDoc = async (propertyId, docId, userId) => {
  const property = await Property.findOne({ _id: propertyId, sellerId: userId });

  if (!property) {
    const err = new Error("Property not found");
    err.statusCode = 404;
    throw err;
  }

  const docObj = property.docs.id(docId);

  if (!docObj) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }

  property.docs.pull({ _id: docId });
  await property.save();

  return docObj;
};

exports.deleteUserPropertyImage = async (propertyId, mediaId, userId) => {
  const property = await Property.findOne({ _id: propertyId, sellerId: userId });

  if (!property) {
    const err = new Error("Property not found");
    err.statusCode = 404;
    throw err;
  }

  const mediaObj = property.media.id(mediaId);

  if (!mediaObj) {
    const err = new Error("Media file not found");
    err.statusCode = 404;
    throw err;
  }

  // Remove media entry
  property.media.pull({ _id: mediaId });
  await property.save();

  return mediaObj;
};