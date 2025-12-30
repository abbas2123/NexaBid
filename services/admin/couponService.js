const Coupon = require('../../models/coupen');
const CouponRedemption = require('../../models/coupenRedemption');

exports.getAllCoupons = async () => {
  return Coupon.find().sort({createdAt:-1}).lean();

};

exports.createCoupon = async (DataTransfer, adminId)=>{
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
  } = data;

  if(!code || !type || ! value) {
    throw new Error('Coupon code, type and value are required');
  }

  const exists = await Coupon.findOne({ code: code.toUpperCase()});
  if(exists){
    throw new Error('Coupon code already exists');
  }

  if(startsAt && expiresAt && new Date(startsAt)> new Date(expiresAt)){
 throw new Error('Start date cannot be after expiry date');
  }

  return Coupon.create({
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
}

exports.toggleCouponStatus = async (couponId) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) throw new Error('Coupon not found');

  coupon.isActive = !coupon.isActive;
  await coupon.save();

  return coupon.isActive;
};

exports.deleteCoupon = async (couponId) => {
  return Coupon.findByIdAndDelete(couponId);
}

exports.applyCoupon = async ({ couponCode, intentId, userId}) => {
  const coupon = await Coupon.findOne({
    conde: couponCode.toUpperCase(),
    isActive: true,
  });

  if(!coupon) throw new Error('Invalid coupon');

  const now = new Date();
  if(
    (coupon.startsAt && now < coupon.startsAt) || 
    (coupon.expiresAt && now > coupon.expiresAt)
  ){
    throw new Error('Coupon expired');
  }

  if(coupon.perUserLimit){
    const used = await CouponRedemption.countDocuments({
      couponId: coupon._id,
      userId,
    });
    if(used >= coupon.perUserLimit) {
      throw new Error('Coupon usage limit reached');
    }
  }

  if(coupon.usageLimit) {
    const totalUsed = await CouponRedemption.countDocuments({
      couponId: coupon._id,
    });
    if(totalUsed >= coupon.usageLimit){
      throw new Error('Coupon fully redeemed');
    }
  }

  const orderAmount = 5000;
  let discount = 0 ;

  if(coupon.type === 'flat'){
    discount = coupon.value;
  }else if (coupon.type === 'percent') {
    discount = Math.floor((orderAmount * coupon.value)/100);
    if(coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  }
  await CouponRedemption.create({
    couponid: coupon._id,
    userId,
    orderReference: intentId,
    amountSaved: discount,
  });
  return discount;
};