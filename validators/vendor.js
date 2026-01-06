const { z } = require('zod');
const { VALIDATION_MESSAGES } = require('../utils/constants');

const vendorVerificationSchema = z
  .object({
    actionType: z.enum(['scan', 'submit']),

    // Fields collected through OCR OR manual entry
    businessName: z.preprocess((v) => {
      if (!v) return undefined;

      const cleaned = String(v)
        .replace(/\s+/g, ' ')
        .replace(/[^a-zA-Z0-9 .&()-]/g, '')
        .trim();

      return cleaned.length ? cleaned : undefined;
    }, z.string().min(3, 'Business Name must be at least 3 characters').optional()),

    panNumber: z.preprocess(
      (v) => {
        if (!v) return undefined;
        return String(v)
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase();
      },
      z
        .string()
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN Number')
        .optional()
    ),
    gstNumber: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z
        .string()
        .transform((v) => v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
        .refine((v) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), {
          message: 'Invalid GST Number',
        })
        .optional()
    ),

    isConfirmed: z.string().optional(),
    terms: z.preprocess((v) => v === 'on', z.boolean()).optional(),
  })
  .superRefine((data, ctx) => {
    // --- 1. If SCAN → files should exist (we validate in controller)
    if (data.actionType === 'scan') return;

    // --- 2. If SUBMIT → must confirm details
    if (data.actionType === 'submit' && data.isConfirmed !== 'true') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: VALIDATION_MESSAGES.CONFIRM_BUSINESS_DETAILS,
        path: ['isConfirmed'],
      });
    }

    // --- 3. If SUBMIT → must accept terms
    if (data.actionType === 'submit' && data.terms !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: VALIDATION_MESSAGES.ACCEPT_TERMS,
        path: ['terms'],
      });
    }
  });
console.log('vendorVerificationSchema.businessName', vendorVerificationSchema.businessName);
module.exports = { vendorVerificationSchema };
