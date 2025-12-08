const authService = require("../../services/user/authService");
const statusCode = require("../../utils/statusCode");
const User = require("../../models/user");
const jwt = require("jsonwebtoken");

exports.getSignupPage = (req, res) => {
  res.render("user/signup", {
    layout: false,
    title: "Signup - NexaBid",
  });
};

exports.registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    console.log(req.body);
    const response = await authService.registerUser({
      name,
      email,
      phone,
      password,
    });
    return res.status(statusCode.CREATED).json({
      success: true,
      ...response,
    });
  } catch (err) {
    return res.status(err.statusCode || statusCode.INTERNAL_ERROR).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
};

exports.getVerifyOtpPage = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.redirect("/auth/signup");
    }
    return res.render("user/otp", {
      layout: false,
      title: "Verify OTP - NexaBid",
      userId,
      mode: "signup",
    });
  } catch (error) {
    res.redirect("/auth/signup");
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    const response = await authService.verifyOtpService({ userId, otp });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res
      .status(statusCode.OK)
      .json({ success: true, ...response, redirect: "/auth/dashboard" });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getLoginPage = (req, res) => {
  res.render("user/login", { layout: false, title: "Login - NexaBid" });
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const response = await authService.LoginUser({ email, password });

    res.cookie("token", response.token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(statusCode.OK).json({
      success: true,
      message: response.message,
      user: response.user,
    });
  } catch (err) {
    return res.status(err.statusCode || statusCode.INTERNAL_ERROR).json({
      success: false,
      message: err.message || "Somthing went wrong",
    });
  }
};

exports.getForgotPasswordPage = (req, res) => {
  res.render("user/forgotPassword", {
    layout: false,
    title: "Forgot Password - NexaBid",
  });
};

exports.postForgotPasswordPage = async (req, res) => {
  try {
    console.log("postreqhit");
    const { email } = req.body;
    console.log(email);
    const response = await authService.forgotPasswordService(email);

    res.status(statusCode.OK).json({
      success: true,
      ...response,
    });
  } catch (err) {
    res.status(statusCode.INTERNAL_ERROR).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getForgotOtpPage = async (req, res) => {
  try {
    console.log("haiiiiiiiiiii");
    const userId = req.query.userId;
    const mode = req.query.mode || "signup";
    console.log(userId);
    if (!userId || userId.trim() === "") {
      return res.redirect("/auth/forgot-password");
    }
    return res.render("user/otp", {
      layout: false,
      title: "Verify OTP - NexaBid",
      userId: req.query.userId,
      mode: "forgot",
    });
  } catch (err) {
    console.log("Error loading forgot OTP page:", err);
    res.redirect("/auth/forgot-password");
  }
};

exports.postForgotOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    console.log("req.body.....:", req.body);
    const result = await authService.verifyForgotOtService({ userId, otp });

    res.status(statusCode.OK).json({
      success: true,
      message: result.message,
      redirectUrl: `/auth/reset-password?userId=${userId}&mode=forgot`,
    });
  } catch (err) {
    res.status(statusCode.INTERNAL_ERROR).json({
      success: false,
      message: err.message,
    });
  }
};


exports.resedOtp = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // 👇 Immediately return response
    res.status(200).json({
      success: true,
      message: "OTP is being resent",
    });

    // 👇 Continue async work AFTER response
    setTimeout(async () => {
      await authService.resendOtpByUserId(userId);
      console.log("OTP resend operation completed");
    }, 0);

  } catch (err) {
    console.error("Resend OTP error:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Something went wrong",
    });
  }
};

exports.getResetPasswordPage = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      res.redirect("/auth/forgot-password");
    }
    res.render("user/resetPassword", {
      layout: false,
      title: "Set New Password",
      userId: req.query.userId,
    });
  } catch (error) {
    res.redirect("/auth/forgot-password");
  }
};

exports.postRestPasswordPage = async (req, res) => {
  try {
    const { userId, password } = req.body;
    console.log("RESET BODY:", req.body);
    const response = await authService.resetPasswordService({
      userId,
      password,
    });
    res.status(statusCode.OK).json({
      success: true,
      ...response,
    });
  } catch (error) {
    res.status(statusCode.INTERNAL_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    console.log("Dashboard Route Hit!");

    const { property: properties, tender: tenders } =await authService.getDashboard();
    return res.status(statusCode.OK).render("user/dashboard", {
      layout: "layouts/user/userLayout",
      title: "Dashboard",
      user: req.user,
      properties,
      tenders,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(statusCode.INTERNAL_ERROR).render("error",{layout:"layouts/user/userLayout",message:'server Error'});
  }
};

