const express = require('express');

const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const authController = require('../../controllers/user/authController');
const authMiddleware = require('../../middlewares/authMiddleware');
const validate = require('../../middlewares/validate');
const {
  singnupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../../validators/auth');

router.get(
  '/signup',
  authMiddleware.nochache,
  authMiddleware.preventAuthPages,
  authController.getSignupPage
);
router.post('/signup', validate(singnupSchema), authController.registerUser);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/login?error=google',
  }),
  async (req, res) => {
    try {
      if (req.user.status === 'blocked') {
        return res.redirect('/auth/login?error=blocked');
      }
      const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });

      res.redirect('/auth/dashboard');
    } catch (err) {
      console.error('JWT Error:', err);
      res.redirect('/auth/login');
    }
  }
);

router.get(
  '/login',
  authMiddleware.nochache,
  authMiddleware.preventAuthPages,
  authController.getLoginPage
);
router.post('/login', validate(loginSchema), authController.loginUser);

router.get('/verify-otp', authMiddleware.preventAuthPages, authController.getVerifyOtpPage);
router.post('/verify-otp', authController.verifyOtp);

router.get(
  '/forgot-password',
  authMiddleware.nochache,
  authMiddleware.preventAuthPages,
  authController.getForgotPasswordPage
);
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  authController.postForgotPasswordPage
);

router.get(
  '/forgot-otp',
  authMiddleware.nochache,
  authMiddleware.checkForgotOtp,
  authController.getForgotOtpPage
);
router.post('/forgot-otp', authController.postForgotOtp);

router.post('/resend-otp', authController.resendOtp);

router.get(
  '/reset-password',
  authMiddleware.nochache,
  authMiddleware.checkResetPassword,
  authController.getResetPasswordPage
);
router.post('/reset-password', validate(resetPasswordSchema), authController.postRestPasswordPage);

router.get('/dashboard', authMiddleware.protectRoute, authController.getDashboard);

module.exports = router;
