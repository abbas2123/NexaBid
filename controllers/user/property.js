const propertyService = require('../../services/property/propertyService.js');
const statusCode = require('../../utils/statusCode');
const { LAYOUTS, VIEWS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../utils/constants');

exports.getPropertyPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    // Extract filters from query params
    const filters = {
      type: req.query.type || '',
      district: req.query.district || '',
      minPrice: req.query.minPrice || '',
      maxPrice: req.query.maxPrice || '',
    };

    const { properties, pagination } = await propertyService.getProperties(page, filters);
console.log(properties);
    res.render('user/property', {
      layout: LAYOUTS.USER_LAYOUT,
      user: req.user,
      properties,
      pagination,
      applied: filters, // Send applied filters to EJS
    });
  } catch (error) {
    console.error('Property page error:', error);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.getPropertyDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    const { property, userHasPaidForProperty, isOwner } = await propertyService.getPropertyDetails(
      id,
      user
    );

    if (!property) {
      return res.status(statusCode.NOT_FOUND).render(VIEWS.ERROR, {
        message: ERROR_MESSAGES.PROPERTY_NOT_FOUND,
        layout: LAYOUTS.USER_LAYOUT,
      });
    }

    res.render('user/propertyDetailsPage', {
      layout: LAYOUTS.USER_LAYOUT,
      user,
      property,
      userHasPaidForProperty: userHasPaidForProperty || false,
      isOwner: isOwner || false,
    });
  } catch (err) {
    console.error('server err', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).send(ERROR_MESSAGES.SERVER_ERROR);
  }
};

exports.getCreatePropertyPage = (req, res) =>
  res.render('user/createProperty', {
    layout: LAYOUTS.USER_LAYOUT,
    title: 'List a Property',
    user: req.user,
    property: null,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  });

exports.postCreateProperty = async (req, res) => {
  console.log('reached');
  try {
    const {
      title,
      description,
      type,
      address,
      locationState,
      locationDistrict,
      geoLat,
      geoLng,
      basePrice,
      isAuction,
      auctionStartsAt,
      auctionEndsAt,
      auctionStep,
      auctionReservePrice,
      bhk,
      size,
    } = req.body;

    const mediaFiles = req.files?.media || [];
    const docFiles = req.files?.docs || [];

    const isAuctionBool = isAuction === 'on' || isAuction === 'true';

    const payload = {
      sellerId: req.user._id,
      title,
      description,
      type,
      address,
      locationState,
      locationDistrict,
      geoLat: geoLat ? Number(geoLat) : undefined,
      geoLng: geoLng ? Number(geoLng) : undefined,
      basePrice: basePrice ? Number(basePrice) : undefined,
      isAuction: isAuctionBool,
      auctionStartsAt: auctionStartsAt ? new Date(auctionStartsAt) : undefined,
      auctionEndsAt: auctionEndsAt ? new Date(auctionEndsAt) : undefined,
      auctionStep: auctionStep ? Number(auctionStep) : undefined,
      auctionReservePrice: auctionReservePrice ? Number(auctionReservePrice) : undefined,
      bhk,
      size,
    };

    const property = await propertyService.createProperty({
      data: payload,
      mediaFiles,
      docFiles,
    });

    return res.status(statusCode.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.PROPERTY_SUBMITTED,
      propertyId: property._id.toString(),
      redirectUrl: `/properties/${property._id.toString()}`,
    });
  } catch (err) {
    console.error('Create Property Error:', err);
    err.statusCode = statusCode.INTERNAL_ERROR
    return res
      .status(err.statusCode)
      .json({ success: false, message: err.message || 'Something went wrong' });
  }
};

exports.updatePropertyController = async (req, res) => {
  try {
    const updatedProperty = await propertyService.updatePropertyService(
      req.params.id,
      req.user._id,
      req.body,
      req.files
    );

    return res.status(statusCode.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.PROPERTY_UPDATED,
      propertyId: updatedProperty._id,
    });
  } catch (err) {
    return res.status(err.statusCode || statusCode.INTERNAL_ERROR).json({
      success: false,
      message: err.message,
    });
  }
};
