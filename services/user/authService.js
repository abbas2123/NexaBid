const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../models/user');
const statusCode = require('../../utils/statusCode');
const { sendOtpEmail } = require('../../utils/email');
const Property = require('../../models/property');
const Tender = require('../../models/tender');
const Otp = require('../../models/otp');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../utils/constants');

// ---------------- REGISTER USER ----------------
exports.registerUser = async ({ name, email, phone, password }) => {
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });

  if (existingUser) {
    const error = new Error(
      existingUser.email === email
        ? ERROR_MESSAGES.EMAIL_ALREADY_EXISTS
        : ERROR_MESSAGES.PHONE_ALREADY_EXISTS
    );
    error.statusCode = statusCode.CONFLICT;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = await User.create({
    name,
    email,
    phone,
    passwordHash,
    isVerified: false,
  });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, salt);

  await Otp.create({
    userId: newUser._id,
    otpHash,
    expiresAt: Date.now() + 60 * 1000,
  });

  sendOtpEmail(email, otp).catch((err) => console.log('Email send error:', err));

  return {
    success: true,
    message: SUCCESS_MESSAGES.OTP_SENT_SUCCESS,
    user: { id: newUser._id },
  };
};

// ---------------- VERIFY OTP ----------------
exports.verifyOtpService = async ({ userId, otp }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);

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

  await User.findByIdAndUpdate(userId, { isVerified: true });
  await Otp.deleteOne({ userId });

  return { message: SUCCESS_MESSAGES.ACCOUNT_VERIFIED };
};

// ---------------- LOGIN USER ----------------
exports.LoginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error(ERROR_MESSAGES.EMAIL_NOT_FOUND);
    error.statusCode = statusCode.NOT_FOUND;
    throw error;
  }
  if (user.status === 'blocked') {
    const error = new Error(ERROR_MESSAGES.ADMIN_BLOCKED);
    error.statusCode = statusCode.UNAUTHORIZED;
    throw error;
  }
  if (!user.isVerified) {
    const error = new Error(ERROR_MESSAGES.VERIFY_OTP_FIRST);
    error.statusCode = statusCode.UNAUTHORIZED;
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

// ---------------- FORGOTPASSWORD ----------------
exports.forgotPasswordService = async (email) => {
  const user = await User.findOne({ email });
  // console.log("user:...........",user);
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

  sendOtpEmail(email, otp).catch((err) => console.log('email error:', err));

  return {
    success: true,
    message: SUCCESS_MESSAGES.OTP_SENT_EMAIL,
    userId: user._id,
  };
};

// ---------------- VERIFY FORGOT PASSWORD OTP ----------------

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

// ---------------- RESET PASSWORD ----------------

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

// ---------------- DASHBOARD DATA ----------------
exports.getDashboard = async () => {
  const now = new Date();

  const property = await Property.find({
    status: 'published',
    verificationStatus: 'approved',
  })
    .limit(6)
    .lean();

  const tender = await Tender.find({ status: 'published', bidEndAt: { $gt: now } }).limit(6);
  return { property, tender };
};

exports.resendOtpByUserId = async (userId) => {
  const user = await User.findById(userId);
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

  await sendOtpEmail(user.email, otp).catch((err) => console.log('Resend OTP email error:', err));

  return {
    success: true,
    message: SUCCESS_MESSAGES.NEW_OTP_SENT,
  };
};
