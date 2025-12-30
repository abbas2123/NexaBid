const Property = require('../../models/property');
const statusCode = require('../../utils/statusCode');
const Payment = require('../../models/payment');
const { parseLocalDatetime, formatIST } = require('../../utils/datetime');

exports.getProperties = async (page = 1, filters = {}) => {
  const limit = 8;

  const query = {
    status: 'published',
    verificationStatus: 'approved',
    deletedAt: null,
  };

  // TYPE FILTER
  if (filters.type) {
    query.type = filters.type;
  }

  // DISTRICT FILTER
  if (filters.district) {
    query.locationDistrict = { $regex: filters.district, $options: 'i' };
  }

  // PRICE FILTER
  if (filters.minPrice || filters.maxPrice) {
    query.$or = [
      {
        buyNowPrice: {
          ...(filters.minPrice ? { $gte: filters.minPrice } : {}),
          ...(filters.maxPrice ? { $lte: filters.maxPrice } : {}),
        },
      },
      {
        basePrice: {
          ...(filters.minPrice ? { $gte: filters.minPrice } : {}),
          ...(filters.maxPrice ? { $lte: filters.maxPrice } : {}),
        },
      },
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
    .populate('soldTo', 'name email phone')
    .populate('currentHighestBidder', 'name email')
    .populate('sellerId', 'name email')
    .lean();

  if (!property)
    return { property: null, userHasPaidForProperty: false, isOwner: false };

  // ✅ Calculate isOwner FIRST
  const isOwner = property.sellerId?._id?.toString() === user._id.toString();

  // Verification check (owner bypasses)
  if (property.verificationStatus !== 'approved') {
    if (!isOwner && user.role !== 'admin') {
      return { property: null, userHasPaidForProperty: false, isOwner: false };
    }
  }

  const userHasPaidForProperty = await Payment.findOne({
    userId: user._id,
    contextId: propertyId,
    status: 'success',
  });

  console.log('userhaspaid', userHasPaidForProperty);
  console.log('isOwner', !!isOwner); // ✅ Now shows true

  return {
    property,
    userHasPaidForProperty: !!userHasPaidForProperty,
    isOwner, // ✅ true for owner
  };
};

const normalize = (value = '') =>
  value.toLowerCase().trim().replace(/\s+/g, ' ');

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
    const err = new Error('A similar property already exists in the system.');
    err.statusCode = statusCode.CONFLICT;
    throw err;
  }

  const media = mediaFiles.map((file) => ({
    url: '/uploads/property-media/' + file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
  }));

  const docs = docFiles.map((file) => ({
    url: '/uploads/property-docs/' + file.filename,
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

    status: 'draft',
    verificationStatus: 'submitted',
    verificationRequestedAt: new Date(),
  });

  return property;
};




exports.updatePropertyService = async (propertyId, userId, body, files) => {
  const existingProperty = await Property.findOne({
    _id: propertyId,
    sellerId: userId,
  });

  if (!existingProperty) {
    const error = new Error('Property not found');
    error.statusCode = statusCode.NOT_FOUND;
    throw error;
  }

  // Update base fields
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

  existingProperty.isAuction = body.isAuction === 'true';

  if (existingProperty.isAuction) {
    existingProperty.basePrice = body.basePrice;
    existingProperty.auctionStartsAt = parseLocalDatetime(body.auctionStartsAt);
    existingProperty.auctionEndsAt = parseLocalDatetime(body.auctionEndsAt);
    existingProperty.auctionStep = body.auctionStep;
    existingProperty.auctionReservePrice = body.auctionReservePrice;
    existingProperty.auctionAutoExtendMins = body.auctionAutoExtendMins;
    existingProperty.auctionLastBidWindowMins = body.auctionLastBidWindowMins;
    existingProperty.buyNowPrice = null;

    // Validate
    if (!existingProperty.auctionStartsAt || !existingProperty.auctionEndsAt) {
      const error = new Error('Auction start/end required');
      error.statusCode = statusCode.BAD_REQUEST;
      throw error;
    }

    if (existingProperty.auctionEndsAt <= existingProperty.auctionStartsAt) {
      const error = new Error('Auction end must be after start');
      error.statusCode = statusCode.BAD_REQUEST;
      throw error;
    }
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

  // Logs: show BOTH ISO (UTC) and IST (what you expect)
  console.log('INPUT start:', body.auctionStartsAt);
  console.log('INPUT end  :', body.auctionEndsAt);

  console.log(
    'STORED start ISO:',
    existingProperty.auctionStartsAt?.toISOString()
  );
  console.log(
    'STORED end   ISO:',
    existingProperty.auctionEndsAt?.toISOString()
  );

  console.log('STORED start IST:', formatIST(existingProperty.auctionStartsAt));
  console.log('STORED end   IST:', formatIST(existingProperty.auctionEndsAt));

  // media update
  if (files?.media?.length > 0) {
    const newMedia = files.media.map((file) => ({
      url: `/uploads/property-media/${file.filename}`,
      fileName: file.filename,
    }));
    existingProperty.media.push(...newMedia);
  }

  // docs update
  if (files?.docs?.length > 0) {
    const newDocs = files.docs.map((file) => ({
      url: `/uploads/property-docs/${file.filename}`,
      fileName: file.filename,
    }));
    existingProperty.docs.push(...newDocs);
  }

  existingProperty.verificationStatus = 'submitted';
  existingProperty.rejectionMessage = null;

  await existingProperty.save();
  return existingProperty;
};


exports.getPropertyForEdit = async (propertyId) => {
  const property = await Property.findById(propertyId).lean();

  if (!property) {
    const err = new Error('Property not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    property,
    media: property.media || [],
    docs: property.docs || [],
  };
};

exports.deleteUserProperty = async (propertyId, userId) => {
  const deletedProperty = await Property.findOneAndUpdate(
    { _id: propertyId, sellerId: userId },
    { deletedAt: new Date() },
    { new: true }
  );

  if (!deletedProperty) {
    const err = new Error('Property not found');
    err.statusCode = 404;
    throw err;
  }

  return deletedProperty;
};

exports.deleteUserPropertyDoc = async (propertyId, docId, userId) => {
  const property = await Property.findOne({
    _id: propertyId,
    sellerId: userId,
  });

  if (!property) {
    const err = new Error('Property not found');
    err.statusCode = 404;
    throw err;
  }

  const docObj = property.docs.id(docId);

  if (!docObj) {
    const err = new Error('Document not found');
    err.statusCode = 404;
    throw err;
  }

  property.docs.pull({ _id: docId });
  await property.save();

  return docObj;
};

exports.deleteUserPropertyImage = async (propertyId, mediaId, userId) => {
  const property = await Property.findOne({
    _id: propertyId,
    sellerId: userId,
  });

  if (!property) {
    const err = new Error('Property not found');
    err.statusCode = 404;
    throw err;
  }

  const mediaObj = property.media.id(mediaId);

  if (!mediaObj) {
    const err = new Error('Media file not found');
    err.statusCode = 404;
    throw err;
  }

  // Remove media entry
  property.media.pull({ _id: mediaId });
  await property.save();

  return mediaObj;
};
