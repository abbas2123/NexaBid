const Property = require('../../models/property');
const TenderParticipants = require('../../models/tenderParticipants');
const { uploadToCloudinary } = require('../../utils/cloudinaryHelper');
const User = require('../../models/user');
const statusCode = require('../../utils/statusCode');
const Payment = require('../../models/payment');
const { parseLocalDatetime } = require('../../utils/datetime');
const { ERROR_MESSAGES } = require('../../utils/constants');

exports.getProperties = async (page = 1, filters = {}) => {
  const limit = 8;

  const query = {
    status: 'published',
    verificationStatus: 'approved',
    deletedAt: null,
  };

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.district) {
    query.locationDistrict = { $regex: filters.district, $options: 'i' };
  }

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
    .sort({ createdAt: -1, _id: -1 })
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

  if (!property) return { property: null, userHasPaidForProperty: false, isOwner: false };

  const isOwner = property.sellerId?._id?.toString() === user._id.toString();

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

  return {
    property,
    userHasPaidForProperty: !!userHasPaidForProperty,
    isOwner,
  };
};

const normalize = (value = '') => value.toLowerCase().trim().replace(/\s+/g, ' ');

exports.createProperty = async ({ data, mediaFiles = [], docFiles = [] }) => {
  const normTitle = normalize(data.title);
  const normAddress = normalize(data.address);
  const normType = normalize(data.type);

  const existing = await Property.findOne({
    title: normTitle,
    address: normAddress,
    type: normType,
    geoLat: data.geoLat,
    geoLng: data.geoLng,
    deletedAt: null,
  });

  if (existing) {
    const err = new Error(ERROR_MESSAGES.PROPERTY_ALREADY_EXISTS);
    err.statusCode = statusCode.CONFLICT;
    throw err;
  }
  const media = [];
  for (const file of mediaFiles) {
    media.push({
      url: file.path,
      publicId: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
  }

  const docs = [];
  for (const file of docFiles) {
    docs.push({
      url: file.path,
      publicId: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
  }
  if (!docs.length) delete data.docs;
  if (!media.length) delete data.media;

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

    isAuction: data.isAuction,
    auctionStartsAt: data.auctionStartsAt,
    auctionEndsAt: data.auctionEndsAt,
    auctionStep: data.auctionStep,
    auctionReservePrice: data.auctionReservePrice,
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
    const error = new Error(ERROR_MESSAGES.PROPERTY_NOT_FOUND);
    error.statusCode = statusCode.NOT_FOUND;
    throw error;
  }

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
    existingProperty.basePrice = null;
    existingProperty.auctionStartsAt = null;
    existingProperty.auctionEndsAt = null;
    existingProperty.auctionStep = null;
    existingProperty.auctionReservePrice = null;
  }

  if (files?.media?.length) {
    for (const file of files.media) {
      let url = file.path;
      if (file.buffer) {
        const cld = await uploadToCloudinary(
          file.buffer,
          'nexabid/properties',
          file.originalname,
          'image'
        );
        url = cld.secure_url;
      }
      existingProperty.media.push({
        url: url,
        publicId: file.filename || `prop_${Date.now()}`,
        fileName: file.originalname,
      });
    }
  }

  if (files?.docs?.length) {
    for (const file of files.docs) {
      let url = file.path;
      if (file.buffer) {
        const cld = await uploadToCloudinary(
          file.buffer,
          'nexabid/properties',
          file.originalname,
          'raw'
        );
        url = cld.secure_url;
      }
      existingProperty.docs.push({
        url: url,
        publicId: file.filename || `doc_${Date.now()}`,
        fileName: file.originalname,
      });
    }
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
    err.statusCode = statusCode.NOT_FOUND;
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
    err.statusCode = statusCode.NOT_FOUND;
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
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }

  const docObj = property.docs.id(docId);

  if (!docObj) {
    const err = new Error('Document not found');
    err.statusCode = statusCode.NOT_FOUND;
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
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }

  const mediaObj = property.media.id(mediaId);

  if (!mediaObj) {
    const err = new Error('Media file not found');
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }

  property.media.pull({ _id: mediaId });
  await property.save();

  return mediaObj;
};
