require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Property = require('../models/property');
const Tender = require('../models/tender');
const VendorApplication = require('../models/vendorApplication');

const PROPERTY_IMAGES = [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071&auto=format&fit=crop', // Villa
    'https://images.unsplash.com/photo-1542621334-a254cf47733d?q=80&w=2069&auto=format&fit=crop', // Commercial
    'https://images.unsplash.com/photo-1512918760383-eda2723ad6e1?q=80&w=2070&auto=format&fit=crop', // Apartment
    'https://images.unsplash.com/photo-1600596542815-3ad19fb812a7?q=80&w=2049&auto=format&fit=crop', // House
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2832&auto=format&fit=crop', // Land
];

const LOCATIONS = ['Alappuzha', 'Kochi', 'Trivandrum', 'Kozhikode', 'Thrissur', 'Kollam'];

// Helper to get random item from array
const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate random date between daysFromNow (negative for past, positive for future)
const randomDate = (minDays, maxDays) => {
    const now = new Date();
    const days = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
};

async function seedLarge() {
    console.log('🌱 Starting Large Data Seed (Graph-Ready)...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ DB Connected');

    // 1. CLEAR DATA
    await User.deleteMany({ email: { $ne: 'nexabid0@gmail.com' } }); // Keep main admin
    await Property.deleteMany({});
    await Tender.deleteMany({});
    await VendorApplication.deleteMany({});
    console.log('🧹 Cleared existing data (preserved main admin)');

    // 2. CREATE USERS (100)
    const users = [];
    const passwordHash = await bcrypt.hash('User@123', 10);

    for (let i = 1; i <= 100; i++) {
        const isVendor = Math.random() > 0.5;
        const createdAt = randomDate(-60, 0); // Registered in last 60 days

        users.push({
            name: `User ${i}`,
            email: `user${i}@example.com`,
            phone: `9${Math.floor(Math.random() * 1000000000)}`,
            passwordHash,
            role: 'user',
            isVendor,
            status: 'active',
            isVerified: true,
            createdAt, // Crucial for Graph
            updatedAt: createdAt
        });
    }
    const createdUsers = await User.insertMany(users);
    console.log(`✅ Defaulted 100 Users`);

    // 2.5 CREATE VENDOR APPLICATIONS
    const vendorApps = [];

    for (const user of createdUsers) {
        if (user.isVendor) {
            // Application submitted 1 day after registration
            const submittedAt = new Date(user.createdAt.getTime() + 1000 * 60 * 60 * 24);
            vendorApps.push({
                userId: user._id,
                businessName: `${user.name} Enterprises`,
                panNumber: 'ABCDE1234F',
                gstNumber: '22AAAAA0000A1Z5',
                status: Math.random() > 0.3 ? 'approved' : 'submitted',
                submittedAt,
                createdAt: submittedAt, // Crucial for Graph
                updatedAt: submittedAt,
                documents: [] // Skipping docs for speed/simplicity
            });
        }
    }
    await VendorApplication.insertMany(vendorApps);
    console.log(`✅ Seeded ${vendorApps.length} Vendor Applications`);

    // 3. CREATE PROPERTIES (100)
    const properties = [];
    const propertyTypes = ['house', 'apartment', 'land', 'commercial'];

    for (let i = 1; i <= 100; i++) {
        const seller = random(createdUsers);
        const type = random(propertyTypes);

        // Determine Auction Status (Past, Live, Future)
        const state = Math.random();
        let auctionStarts, auctionEnds;

        if (state < 0.33) {
            // PAST (Ended 10-30 days ago)
            auctionEnds = randomDate(-30, -10);
            auctionStarts = new Date(auctionEnds.getTime() - 5 * 24 * 60 * 60 * 1000);
        } else if (state < 0.66) {
            // LIVE (Started 2 days ago, ends in 3 days)
            auctionStarts = randomDate(-2, 0);
            auctionEnds = randomDate(1, 5);
        } else {
            // FUTURE (Starts in 5-15 days)
            auctionStarts = randomDate(5, 15);
            auctionEnds = new Date(auctionStarts.getTime() + 5 * 24 * 60 * 60 * 1000);
        }

        // Created 5-20 days before auction start
        const createdAt = new Date(auctionStarts.getTime() - (Math.floor(Math.random() * 15) + 5) * 24 * 60 * 60 * 1000);

        properties.push({
            sellerId: seller._id,
            title: `${type.toUpperCase()} - Property ${i}`,
            description: `A beautiful ${type} listed for auction. User ID: ${seller._id}`,
            type,
            address: `Address Line ${i}`,
            locationState: 'Kerala',
            locationDistrict: random(LOCATIONS),
            geoLat: 9.9312 + (Math.random() * 0.5),
            geoLng: 76.2673 + (Math.random() * 0.5),
            size: Math.floor(Math.random() * 5000) + 500,
            bhk: type === 'house' || type === 'apartment' ? Math.floor(Math.random() * 4) + 1 : undefined,
            basePrice: Math.floor(Math.random() * 10000000) + 500000,
            isAuction: true,
            auctionStartsAt: auctionStarts,
            auctionEndsAt: auctionEnds,
            auctionStep: 10000,
            auctionReservePrice: 0,
            status: 'published',
            verificationStatus: 'approved',
            verificationRequestedAt: createdAt,
            media: [{ url: random(PROPERTY_IMAGES) }],
            docs: [{ url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
            createdAt, // Crucial for Graph
            updatedAt: createdAt
        });
    }
    await Property.insertMany(properties);
    console.log(`✅ Seeded 100 Properties (Mixed Dates)`);

    // 4. CREATE TENDERS (100)
    const tenders = [];
    const depts = ['PWD', 'Health', 'Education', 'IT', 'Irrigation'];

    // Use first 5 users as "officials" for creating tenders
    const officials = createdUsers.slice(0, 5);

    for (let i = 1; i <= 100; i++) {
        const creator = random(officials);
        const dept = random(depts);

        // Determine Timeline
        const state = Math.random();
        let bidStart, bidEnd;

        if (state < 0.33) {
            // PAST
            bidEnd = randomDate(-30, -5);
            bidStart = new Date(bidEnd.getTime() - 10 * 24 * 60 * 60 * 1000);
        } else if (state < 0.66) {
            // ACTIVE
            bidStart = randomDate(-5, -1);
            bidEnd = randomDate(2, 10);
        } else {
            // FUTURE
            bidStart = randomDate(10, 20);
            bidEnd = new Date(bidStart.getTime() + 15 * 24 * 60 * 60 * 1000);
        }

        // Created 2-10 days before bid start
        const createdAt = new Date(bidStart.getTime() - (Math.floor(Math.random() * 8) + 2) * 24 * 60 * 60 * 1000);

        tenders.push({
            createdBy: creator._id,
            title: `Tender for ${dept} Project ${i}`,
            dept,
            category: 'Civil Works',
            description: `Detailed description for tender ${i}`,
            type: 'open',
            emdAmount: Math.floor(Math.random() * 50000) + 5000,
            docFee: 500,
            publishAt: new Date(bidStart.getTime() - 2 * 24 * 60 * 60 * 1000),
            bidStartAt: bidStart,
            bidEndAt: bidEnd,
            techOpenAt: new Date(bidEnd.getTime() + 1 * 24 * 60 * 60 * 1000),
            finOpenAt: new Date(bidEnd.getTime() + 3 * 24 * 60 * 60 * 1000),
            status: 'published',
            version: 1,
            createdAt, // Crucial for Graph
            updatedAt: createdAt
        });
    }
    await Tender.insertMany(tenders);
    console.log(`✅ Seeded 100 Tenders (Mixed Dates)`);

    console.log('🎉 Large Data Seeding Complete!');
    process.exit(0);
}

seedLarge().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
