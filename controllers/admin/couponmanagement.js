const statusCode = require('../../utils/statusCode');
const {
  VIEWS,
  LAYOUTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  COUPON_MESSAGES,
  TITLES,
} = require('../../utils/constants');
const {
  getCouponManagementData,
  createCouponService,
  toggleCouponStatusService,
  deleteCouponService,
  applyCouponService,
} = require('../../services/admin/couponService');
exports.couponManagementPage = async (req, res) => {
  try {
    const { coupons } = await getCouponManagementData();
    res.render(VIEWS.ADMIN_COUPON_MANAGEMENT, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      title: TITLES.COUPON_MANAGEMENT,
      coupons,
      user: req.admin,
      currentPage: 'coupons',
    });
  } catch (err) {
    console.error('coupon Management Error:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).render(VIEWS.ERROR, {
      layout: LAYOUTS.ADMIN_LAYOUT,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
exports.createCoupon = async (req, res) => {
  try {
    const result = await createCouponService(req.body, req.admin._id);
    if (!result.ok) {
      if (result.reason === COUPON_MESSAGES.MISSING_FIELDS) {
        return res.status(statusCode.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.COUPON_REQUIRED_FIELDS,
        });
      }
      if (result.reason === COUPON_MESSAGES.COUPON_EXISTS) {
        return res.status(statusCode.CONFLICT).json({
          success: false,
          message: ERROR_MESSAGES.COUPON_EXISTS,
        });
      }
      if (result.reason === COUPON_MESSAGES.INVALID_DATE_RANGE) {
        return res.status(statusCode.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.INVALID_DATE_RANGE,
        });
      }
    }
    return res.json({
      success: true,
      message: SUCCESS_MESSAGES.COUPON_CREATED,
      coupon: result.coupon,
    });
  } catch (err) {
    console.error('Create Coupon Error:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};
exports.toggleCouponStatus = async (req, res) => {
  try {
    const result = await toggleCouponStatusService(req.params.id);
    console.log('result',result);
    if (!result.ok && result.reason === COUPON_MESSAGES.NOT_FOUND) {
      return res.status(statusCode.NOT_FOUND).json({ success: false });
    }
    res.json({
      success: true,
      isActive: result.isActive,
    });
  } catch (err) {
    console.error('Toggle Coupon Error:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};
exports.deleteCoupon = async (req, res) => {
  try {
    await deleteCouponService(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete Coupon Error:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode, intentId } = req.body;
    const userId = req.user._id;
    const result = await applyCouponService({
      couponCode,
      intentId,
      userId,
      orderAmount: 5000,
    });
    if (!result.ok) {
      let message = ERROR_MESSAGES.INVALID_COUPON;
      if (result.reason === COUPON_MESSAGES.COUPON_EXPIRED) {
        message = ERROR_MESSAGES.COUPON_EXPIRED;
      } else if (result.reason === COUPON_MESSAGES.COUPON_LIMIT_REACHED) {
        message = ERROR_MESSAGES.COUPON_LIMIT_REACHED;
      } else if (result.reason === COUPON_MESSAGES.COUPON_FULLY_REDEEMED) {
        message = ERROR_MESSAGES.COUPON_FULLY_REDEEMED;
      }
      return res.json({
        success: false,
        message,
      });
    }
    return res.json({
      success: true,
      discount: result.discount,
      message: SUCCESS_MESSAGES.COUPON_APPLIED,
    });
  } catch (err) {
    console.error('Apply Coupon Error:', err);
    res.status(statusCode.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};
