const { z } = require('zod');
const { VALIDATION_MESSAGES } = require('../utils/constants');

const vendorVerificationSchema = z
  .object({
    actionType: z.enum(['scan', 'submit']),

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
    if (data.actionType === 'scan') return;

    if (data.actionType === 'submit') {
      if (!data.businessName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Business Name is required for submission',
          path: ['businessName'],
        });
      }
      if (!data.panNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PAN Number is required for submission',
          path: ['panNumber'],
        });
      }
      if (!data.gstNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GST Number is required for submission',
          path: ['gstNumber'],
        });
      }

      if (data.isConfirmed !== 'true') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: VALIDATION_MESSAGES.CONFIRM_BUSINESS_DETAILS,
          path: ['isConfirmed'],
        });
      }

      if (data.terms !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: VALIDATION_MESSAGES.ACCEPT_TERMS,
          path: ['terms'],
        });
      }
    }
  });

module.exports = { vendorVerificationSchema };
