const Coupon = require('../../models/coupen');
const CouponRedemption = require('../../models/coupenRedemption');

exports.couponManagementPage = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();

    res.render('admin/couponManagement', {
      layout: 'layouts/admin/adminLayout',
      coupons,
      user: req.admin,
      currentPage: 'coupons',
    });
  } catch (err) {
    console.error('coupon Management Error:', err);
    res.status(500).send('server Error');
  }
};

exports.createCoupon = async (req, res) => {
  try {
    console.log('created');
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
    } = req.body;

    if (!code || !type || !value) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code, type and value are required',
      });
    }

    const exists = await Coupon.findOne({ code: code.toUpperCase() });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'Coupon code already exists',
      });
    }

    if (startsAt && expiresAt && new Date(startsAt) > new Date(expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after expiry date',
      });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      type, // flat | percent | cashback
      value,
      maxDiscount: maxDiscount || null,
      minPurchaseAmount: minPurchaseAmount || null,
      startsAt: startsAt || null,
      expiresAt: expiresAt || null,
      usageLimit: usageLimit || null,
      perUserLimit: perUserLimit || null,
      applicableTo: applicableTo || 'all',
      createdBy: req.admin._id,
      isActive: true,
    });

    return res.json({
      success: true,
      message: 'Coupon created successfully',
      coupon,
    });
  } catch (err) {
    console.error('Create Coupon Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

exports.toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({
      success: true,
      isActive: coupon.isActive,
    });
  } catch (err) {
    console.error('Toggle Coupon Error:', err);
    res.status(500).json({ success: false });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete Coupon Error:', err);
    res.status(500).json({ success: false });
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode, intentId } = req.body;
    const userId = req.user._id;

    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
    });

    if (!coupon) {
      return res.json({ success: false, message: 'Invalid coupon' });
    }

    const now = new Date();
    if (
      (coupon.startsAt && now < coupon.startsAt) ||
      (coupon.expiresAt && now > coupon.expiresAt)
    ) {
      return res.json({ success: false, message: 'Coupon expired' });
    }

    if (coupon.perUserLimit) {
      const used = await CouponRedemption.countDocuments({
        couponId: coupon._id,
        userId,
      });
      if (used >= coupon.perUserLimit) {
        return res.json({
          success: false,
          message: 'Coupon usage limit reached',
        });
      }
    }

    if (coupon.usageLimit) {
      const totalUsed = await CouponRedemption.countDocuments({
        couponId: coupon._id,
      });
      if (totalUsed >= coupon.usageLimit) {
        return res.json({
          success: false,
          message: 'Coupon fully redeemed',
        });
      }
    }

    let discount = 0;
    const orderAmount = 5000;

    if (coupon.type === 'flat') {
      discount = coupon.value;
    } else if (coupon.type === 'percent') {
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

    return res.json({
      success: true,
      discount,
      message: 'Coupon applied successfully',
    });
  } catch (err) {
    console.error('Apply Coupon Error:', err);
    res.status(500).json({ success: false });
  }
};
