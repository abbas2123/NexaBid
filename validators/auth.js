const { z } = require('zod');
const {VALIDATION_MESSAGES} = require('../utils/constants');

exports.singnupSchema = z.object({
  name: z.string().min(3, 'Name must have at least 3 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

exports.loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

// Admin login validation
exports.adminLoginSchema = z.object({
  email: z.string().email('Invalid admin email'),
  password: z.string().min(6, 'Password required'),
});

// Reset password validation
exports.resetPasswordSchema = z
  .object({
    userId: z.string().min(1, 'User ID missing'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: VALIDATION_MESSAGES.PASSWORDS_DO_NOT_MATCH,
    path: ['confirmPassword'],
  });

// Forgot password validation
exports.forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});
