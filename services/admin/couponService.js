const Coupon = require('../../models/coupen');
const CouponRedemption = require('../../models/coupenRedemption');
const { COUPON_TYPES, COUPON_MESSAGES } = require('../../utils/constants');
async function getCouponManagementData() {
  await Coupon.updateMany(
    { expiresAt: { $lt: new Date() }, isActive: true },
    { $set: { isActive: false } }
  );
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
  return { coupons };
}
async function createCouponService(payload, adminId) {
  const {
    code,
    type,
    value,
    maxDiscount,
    minPurchaseAmount,
    startsAt,
    expiresAt,
    usageLimit,
    perUserLimit,
    applicableTo,
    description,
  } = payload;
  if (!code || !type || !value) {
    return {
      ok: false,
      reason: COUPON_MESSAGES.MISSING_FIELDS,
    };
  }
  const exists = await Coupon.findOne({ code: code.toUpperCase() });
  if (exists) {
    return {
      ok: false,
      reason: COUPON_MESSAGES.COUPON_EXISTS,
    };
  }
  if (startsAt && expiresAt && new Date(startsAt) > new Date(expiresAt)) {
    return {
      ok: false,
      reason: COUPON_MESSAGES.INVALID_DATE_RANGE,
    };
  }
  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    description,
    type,
    value,
    maxDiscount: maxDiscount || null,
    minPurchaseAmount: minPurchaseAmount || null,
    startsAt: startsAt || null,
    expiresAt: expiresAt || null,
    usageLimit: usageLimit || null,
    perUserLimit: perUserLimit || null,
    applicableTo: applicableTo || 'all',
    createdBy: adminId,
    isActive: true,
  });
  return {
    ok: true,
    coupon,
  };
}
async function toggleCouponStatusService(couponId) {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    return { ok: false, reason: COUPON_MESSAGES.NOT_FOUND };
  }
  coupon.isActive = !coupon.isActive;
  await coupon.save();
  return {
    ok: true,
    isActive: coupon.isActive,
  };
}
async function deleteCouponService(couponId) {
  await Coupon.findByIdAndDelete(couponId);
  return { ok: true };
}
async function applyCouponService({ couponCode, intentId, userId, orderAmount = 5000 }) {
  const coupon = await Coupon.findOne({
    code: couponCode.toUpperCase(),
  });
  if (!coupon) {
    return {
      ok: false,
      reason: COUPON_MESSAGES.INVALID_COUPON,
    };
  }
  const now = new Date();
  if ((coupon.startsAt && now < coupon.startsAt) || (coupon.expiresAt && now > coupon.expiresAt)) {
    return {
      ok: false,
      reason: COUPON_MESSAGES.COUPON_EXPIRED,
    };
  }
  if (coupon.perUserLimit) {
    const used = await CouponRedemption.countDocuments({
      couponId: coupon._id,
      userId,
    });
    if (used >= coupon.perUserLimit) {
      return {
        ok: false,
        reason: COUPON_MESSAGES.COUPON_LIMIT_REACHED,
      };
    }
  }
  if (coupon.usageLimit) {
    const totalUsed = await CouponRedemption.countDocuments({
      couponId: coupon._id,
    });
    if (totalUsed >= coupon.usageLimit) {
      return {
        ok: false,
        reason: COUPON_MESSAGES.COUPON_FULLY_REDEEMED,
      };
    }
  }
  let discount = 0;
  if (coupon.type === COUPON_TYPES.FLAT) {
    discount = coupon.value;
  } else if (coupon.type === COUPON_TYPES.PERCENT) {
    discount = Math.floor((orderAmount * coupon.value) / 100);
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  }
  await CouponRedemption.create({
    couponId: coupon._id,
    userId,
    orderReference: intentId,
    amountSaved: discount,
  });
  return {
    ok: true,
    discount,
  };
}
module.exports = {
  getCouponManagementData,
  createCouponService,
  toggleCouponStatusService,
  deleteCouponService,
  applyCouponService,
};
