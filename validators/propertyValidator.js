const { z } = require('zod');

const propertySchema = z.object({
    title: z.string().min(1, { message: 'Title is required' }),
    description: z.string().min(1, { message: 'Description is required' }),
    type: z.string().min(1, { message: 'Property Type is required' }),

    // Address & Location
    address: z.string().min(1, { message: 'Address is required' }),
    locationState: z.string().min(1, { message: 'State is required' }),
    locationDistrict: z.string().min(1, { message: 'District is required' }),
    geoLat: z.string().min(1, { message: 'Map Location (Latitude) is required' }),
    geoLng: z.string().min(1, { message: 'Map Location (Longitude) is required' }),

    // Property Specs
    bhk: z.string().min(1, { message: 'BHK is required' }),
    size: z.string().min(1, { message: 'Size (sqft) is required' }),

    // Pricing (Auction vs Normal)
    basePrice: z.string().optional(),
    isAuction: z.string().or(z.boolean()).optional(),
    auctionStep: z.string().optional(),
    auctionReservePrice: z.string().optional(),
    auctionStartsAt: z.string().optional(),
    auctionEndsAt: z.string().optional(),

    // Media (Files)
    media: z.preprocess(
        (val) => (val === undefined || val === null ? [] : val),
        z.array(z.any()).min(1, { message: "At least 1 property image is required" })
    )
}).superRefine((data, ctx) => {
    // Check auction status carefully
    const isAuction = String(data.isAuction).toLowerCase() === 'true' || data.isAuction === 'on' || data.isAuction === true;

    if (isAuction) {
        // Helper to check for useful value
        const verify = (field, name) => {
            if (!data[field] || String(data[field]).trim() === '') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `${name} is required for auctions`,
                    path: [field],
                });
            }
        };

        verify('basePrice', 'Base Price');
        verify('auctionStep', 'Auction Step');
        verify('auctionReservePrice', 'Reserve Price');
        verify('auctionStartsAt', 'Auction Start Date');
        verify('auctionEndsAt', 'Auction End Date');

        if (data.auctionStartsAt && data.auctionEndsAt) {
            const start = new Date(data.auctionStartsAt);
            const end = new Date(data.auctionEndsAt);
            if (end <= start) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'End Date must be after Start Date',
                    path: ['auctionEndsAt'],
                });
            }
        }
    }
});

module.exports = propertySchema;
