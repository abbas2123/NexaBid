const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../models/user');
const statusCode = require('../../utils/statusCode');
const { sendOtpEmail } = require('../../utils/email');
const Property = require('../../models/property');
const Tender = require('../../models/tender');
const Otp = require('../../models/otp');
const PendingUser = require('../../models/pendingUser');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../utils/constants');

exports.registerUser = async ({ name, email, phone, password }) => {
  const [existingUser, existingPendingUser] = await Promise.all([
    User.findOne({ $or: [{ email }, { phone }] }),
    PendingUser.findOne({ $or: [{ email }, { phone }] }),
  ]);

  if (existingUser || existingPendingUser) {
    const user = existingUser || existingPendingUser;
    const error = new Error(
      user.email === email
        ? ERROR_MESSAGES.EMAIL_ALREADY_EXISTS
        : ERROR_MESSAGES.PHONE_ALREADY_EXISTS
    );
    error.statusCode = statusCode.CONFLICT;
    throw error;
  }
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const pendingUser = await PendingUser.create({
    name,
    email,
    phone,
    passwordHash,
  });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, salt);
  await Otp.create({
    userId: pendingUser._id,
    otpHash,
    expiresAt: Date.now() + 60 * 1000,
  });
  sendOtpEmail(email, otp).catch((err) => console.error('Email send error:', err));
  return {
    success: true,
    message: SUCCESS_MESSAGES.OTP_SENT_SUCCESS,
    user: { id: pendingUser._id },
  };
};
exports.verifyOtpService = async ({ userId, otp, mode = 'signup' }) => {
  const otpRecord = await Otp.findOne({ userId });
  if (!otpRecord) {
    const err = new Error(ERROR_MESSAGES.OTP_EXPIRED_NOT_FOUND);
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }
  if (otpRecord.expiresAt < Date.now()) {
    await Otp.deleteOne({ userId });
    const err = new Error(ERROR_MESSAGES.OTP_EXPIRED_NOT_FOUND);
    err.statusCode = statusCode.UNAUTHORIZED;
    throw err;
  }
  const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isMatch) {
    const err = new Error(ERROR_MESSAGES.OTP_EXPIRED_NOT_FOUND);
    err.statusCode = statusCode.UNAUTHORIZED;
    throw err;
  }

  if (mode === 'signup') {
    // Check PendingUser first, then User (for legacy unverified users)
    let pendingUser = await PendingUser.findById(userId);
    let isLegacy = false;

    if (!pendingUser) {
      pendingUser = await User.findById(userId);
      if (!pendingUser || pendingUser.isVerified) {
        const err = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        err.statusCode = statusCode.NOT_FOUND;
        throw err;
      }
      isLegacy = true;
    }

    let newUser;
    if (!isLegacy) {
      // Create permanent user from pending data
      newUser = await User.create({
        name: pendingUser.name,
        email: pendingUser.email,
        phone: pendingUser.phone,
        passwordHash: pendingUser.passwordHash,
        isVerified: true,
      });
      await PendingUser.findByIdAndDelete(userId);
    } else {
      // Update legacy user
      newUser = await User.findByIdAndUpdate(userId, { isVerified: true }, { new: true });
    }

    await Otp.deleteOne({ userId });

    return {
      message: SUCCESS_MESSAGES.ACCOUNT_VERIFIED,
      user: newUser
    };
  } else {
    // Mode is forgot password
    const user = await User.findById(userId);
    if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);

    await Otp.deleteOne({ userId });
    return { message: SUCCESS_MESSAGES.OTP_VERIFIED_SUCCESS };
  }
};
exports.LoginUser = async ({ email, password }) => {
  let user = await User.findOne({ email });
  let isPending = false;

  if (!user) {
    user = await PendingUser.findOne({ email });
    if (!user) {
      const error = new Error(ERROR_MESSAGES.EMAIL_NOT_FOUND);
      error.statusCode = statusCode.NOT_FOUND;
      throw error;
    }
    isPending = true;
  }

  if (user.status === 'blocked') {
    const error = new Error(ERROR_MESSAGES.ADMIN_BLOCKED);
    error.statusCode = statusCode.UNAUTHORIZED;
    throw error;
  }

  if (isPending || !user.isVerified) {
    const error = new Error(ERROR_MESSAGES.VERIFY_OTP_FIRST);
    error.statusCode = statusCode.UNAUTHORIZED;
    error.userId = user._id; // Attach userId for the frontend to use
    error.needsVerification = true;
    throw error;
  }

  const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordMatch) {
    const error = new Error(ERROR_MESSAGES.INVALID_PASSWORD);
    error.statusCode = statusCode.UNAUTHORIZED;
    throw error;
  }

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token,
    message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
  };
};
exports.forgotPasswordService = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error(ERROR_MESSAGES.EMAIL_NOT_FOUND);
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }
  await Otp.deleteOne({ userId: user._id });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);
  await Otp.create({
    userId: user._id,
    otpHash,
  });
  sendOtpEmail(email, otp).catch((err) => console.error('email error:', err));
  return {
    success: true,
    message: SUCCESS_MESSAGES.OTP_SENT_EMAIL,
    userId: user._id,
  };
};
exports.verifyForgotOtService = async ({ userId, otp }) => {
  const otpRecord = await Otp.findOne({ userId });
  if (!otpRecord) {
    const err = new Error(ERROR_MESSAGES.OTP_EXPIRED_NOT_FOUND);
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }
  const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isMatch) {
    const err = new Error(ERROR_MESSAGES.OTP_EXPIRED_NOT_FOUND);
    err.statusCode = statusCode.UNAUTHORIZED;
    throw err;
  }
  await Otp.deleteOne({ userId });
  return {
    success: true,
    message: SUCCESS_MESSAGES.OTP_VERIFIED_SUCCESS,
  };
};
exports.resetPasswordService = async ({ userId, password }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  await User.findByIdAndUpdate(userId, { passwordHash });
  return {
    success: true,
    message: SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS,
  };
};
exports.getDashboard = async () => {
  const now = new Date();
  const [property, tender] = await Promise.all([
    Property.find({
      status: 'published',
      verificationStatus: 'approved',
      isBlocked: { $ne: true }
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .lean(),
    Tender.find({ status: 'published', bidEndAt: { $gt: now }, isBlocked: { $ne: true } })
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .lean()
  ]);
  return { property, tender };
};
exports.resendOtpByUserId = async (userId) => {
  const user = (await User.findById(userId)) || (await PendingUser.findById(userId));
  if (!user) {
    const err = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }
  await Otp.deleteOne({ userId });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);
  await Otp.create({
    userId,
    otpHash,
    expiresAt: Date.now() + 60 * 1000,
  });
  await sendOtpEmail(user.email, otp).catch((err) => console.error('Resend OTP email error:', err));
  return {
    success: true,
    message: SUCCESS_MESSAGES.NEW_OTP_SENT,
  };
};
