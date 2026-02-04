const { z } = require('zod');

const tenderSchema = z.object({
    title: z.string().min(1, { message: 'Tender Title is required' }),
    dept: z.string().min(1, { message: 'Department is required' }),
    category: z.string().min(1, { message: 'Category is required' }),
    description: z.string().optional(),
    type: z.enum(['open', 'restricted'], { message: 'Invalid Tender Type' }).optional(),

    emdAmount: z.string().or(z.number()).transform((val) => Number(val)).optional(),
    docFee: z.string().or(z.number()).transform((val) => Number(val)).optional(),

    publishAt: z.string().optional(),
    bidStartAt: z.string().optional(),
    bidEndAt: z.string().min(1, { message: 'Bid End Date is required' }),
    techOpenAt: z.string().optional(),
    finOpenAt: z.string().optional(),

    eligibilityCategories: z.string().optional(),
    eligibilityGrade: z.string().optional()
}).superRefine((data, ctx) => {
    if (data.bidStartAt && data.bidEndAt) {
        const start = new Date(data.bidStartAt);
        const end = new Date(data.bidEndAt);
        if (end <= start) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Bid End Date must be after Bid Start Date',
                path: ['bidEndAt'],
            });
        }
    }
});

module.exports = tenderSchema;
