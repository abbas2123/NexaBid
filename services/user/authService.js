const User = require("../../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const statusCode = require("../../utils/statusCode");
const { sendOtpEmail } = require("../../utils/email");
const Property = require("../../models/property");
const Tender = require("../../models/tender");
const Otp = require("../../models/otp");
const { status } = require("init");

// ---------------- REGISTER USER ----------------
exports.registerUser = async ({ name, email, phone, password }) => {
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });

  if (existingUser) {
    const error = new Error(
      existingUser.email === email
        ? "Email already exists"
        : "Phone already exists",
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
  });

  sendOtpEmail(email, otp).catch((err) =>
    console.log("Email send error:", err),
  );

  return {
    success: true,
    message: "OTP sent successfully",
    user: { id: newUser._id },
  };
};

// ---------------- VERIFY OTP ----------------
exports.verifyOtpService = async ({ userId, otp }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const otpRecord = await Otp.findOne({ userId });
  if (!otpRecord) {
    const err = new Error("OTP expired or not found");
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }

  const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isMatch) {
    const err = new Error("Invalid OTP");
    err.statusCode = statusCode.UNAUTHORIZED;
    throw err;
  }

  await User.findByIdAndUpdate(userId, { isVerified: true });
  await Otp.deleteOne({ userId });

  return { message: "Account Verified Successfully 🎉" };
};

// ---------------- LOGIN USER ----------------
exports.LoginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error("Email not found");
    error.statusCode = statusCode.NOT_FOUND;
    throw error;
  }
  if (user.status === "blocked") {
    const error = new Error("Admin Blocked! Please contact Admin");
    error.status = statusCode.UNAUTHORIZED;
    throw error;
  }
  if (!user.isVerified) {
    const error = new Error("Please verify your OTP first");
    error.statusCode = statusCode.UNAUTHORIZED;
    throw error;
  }

  const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordMatch) {
    const error = new Error("Invalid Password");
    error.statusCode = statusCode.UNAUTHORIZED;
    throw error;
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token,
    message: "Login successful 🎉",
  };
};

// ---------------- FORGOTPASSWORD ----------------
exports.forgotPasswordService = async (email) => {
  const user = await User.findOne({ email });
  // console.log("user:...........",user);
  if (!user) {
    const err = new Error("Email not found");
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

  sendOtpEmail(email, otp).catch((err) => console.log("email error:", err));

  return {
    success: true,
    message: "OTP send to your email",
    userId: user._id,
  };
};

// ---------------- VERIFY FORGOT PASSWORD OTP ----------------

exports.verifyForgotOtService = async ({ userId, otp }) => {
  const otpRecord = await Otp.findOne({ userId });

  if (!otpRecord) {
    const err = new Error("OTP expired or not found");
    err.statusCode = statusCode.NOT_FOUND;
    throw err;
  }

  const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isMatch) {
    const err = new Error("Invalid OTP");
    err.statusCode = statusCode.UNAUTHORIZED;
    throw err;
  }

  await Otp.deleteOne({ userId });

  return {
    success: true,
    message: "OTP Verified Successfully",
  };
};

// ---------------- RESET PASSWORD ----------------

exports.resetPasswordService = async ({ userId, password }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  await User.findByIdAndUpdate(userId, { passwordHash });

  return {
    success: true,
    message: "Password reset successfully",
  };
};

// ---------------- DASHBOARD DATA ----------------
exports.getDashboard = async () => {
  const property = await Property.find().limit(6);
  const tender = await Tender.find().limit(6);
  return { property, tender };
};
