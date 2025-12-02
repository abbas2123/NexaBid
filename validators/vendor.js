const { z } = require("zod");

const vendorVerificationSchema = z.object({
  actionType: z.enum(["scan", "submit"]),

  // Fields collected through OCR OR manual entry
  businessName: z.string()
    .min(3, "Business Name must be at least 3 characters")
    .optional(),

  panNumber: z.string()
    .regex(/[A-Z]{5}[0-9]{4}[A-Z]{1}/, "Invalid PAN Number")
    .optional(),

  gstNumber: z.string()
    .regex(/^([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})$/,
      "Invalid GST Number")
    .optional(),

  isConfirmed: z.string().optional(),
  terms: z.string().optional()
})
.superRefine((data, ctx) => {

  // --- 1. If SCAN → files should exist (we validate in controller)
  if (data.actionType === "scan") return;

  // --- 2. If SUBMIT → must confirm details
  if (data.actionType === "submit" && data.isConfirmed !== "true") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "You must confirm your business details",
      path: ["isConfirmed"]
    });
  }

  // --- 3. If SUBMIT → must accept terms
  if (data.actionType === "submit" && data.terms !== "true") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "You must accept the terms",
      path: ["terms"]
    });
  }
});

module.exports = { vendorVerificationSchema };