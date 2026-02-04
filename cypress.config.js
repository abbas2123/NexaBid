const { defineConfig } = require("cypress");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/user');
require('dotenv').config();

module.exports = defineConfig({
    e2e: {
        baseUrl: "http://localhost:3000",
        setupNodeEvents(on, config) {
            on('task', {
                async seedUser({ name, email, password, role, isVendor }) {
                    if (mongoose.connection.readyState === 0) {
                        console.log('Connecting to:', process.env.MONGO_URI);
                        await mongoose.connect(process.env.MONGO_URI);
                    }
                    console.log('Using DB:', mongoose.connection.name);

                    await User.deleteOne({ email });

                    const hash = await bcrypt.hash(password || 'Password@123', 10);
                    const user = await User.create({
                        name,
                        email,
                        passwordHash: hash,
                        phone: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
                        role: role || 'vendor',
                        isVendor: isVendor !== undefined ? isVendor : true,
                        isVerified: true,
                        status: 'active'
                    });
                    return user.email;
                },
                async seedAdmin({ email, password }) {
                    if (mongoose.connection.readyState === 0) {
                        await mongoose.connect(process.env.MONGO_URI);
                    }

                    await User.deleteOne({ email });

                    const hash = await bcrypt.hash(password || 'Admin@123', 10);
                    const admin = await User.create({
                        name: 'E2E Admin',
                        email,
                        passwordHash: hash,
                        role: 'admin',
                        isVerified: true,
                        status: 'active'
                    });
                    return admin.email;
                },
                async seedVendorApplication({ email, businessName }) {
                    if (mongoose.connection.readyState === 0) {
                        await mongoose.connect(process.env.MONGO_URI);
                    }

                    // We need to load the model dynamically or ensure it's loaded
                    const VendorApplication = require('./models/vendorApplication');

                    const user = await User.findOne({ email });
                    if (!user) throw new Error(`User ${email} not found for seeding vendor app`);

                    await VendorApplication.deleteMany({ userId: user._id });

                    await VendorApplication.create({
                        userId: user._id,
                        businessName: businessName || 'Test Business',
                        panNumber: 'ABCDE1234F',
                        gstNumber: '22AAAAA0000A1Z5',
                        status: 'submitted',
                        submittedAt: new Date(),
                        // Intentionally leaving documents empty to allow test to run without complex file/ocr seeding
                        // If the app breaks, we will need to seed fake OCR/File docs
                    });

                    return user.email;
                },
                async seedProperty(data) {
                    if (mongoose.connection.readyState === 0) {
                        await mongoose.connect(process.env.MONGO_URI);
                    }
                    const Property = require('./models/property');
                    const User = require('./models/user');

                    const seller = await User.findOne({ email: data.sellerEmail });
                    if (!seller) throw new Error(`Seller ${data.sellerEmail} not found`);

                    await Property.create({
                        sellerId: seller._id,
                        title: data.title || 'Test Property',
                        description: 'Test Description',
                        type: 'house',
                        address: '123 Test St',
                        locationState: 'Test State',
                        locationDistrict: 'Test District',
                        geoLat: 0,
                        geoLng: 0,
                        basePrice: data.basePrice || 100000,
                        isAuction: data.isAuction || false,
                        auctionStartsAt: data.auctionStartsAt || null,
                        auctionEndsAt: data.auctionEndsAt || null,
                        status: data.status || 'published',
                        verificationStatus: data.verificationStatus || 'approved',
                        media: [{ url: 'https://example.com/image.jpg', type: 'image' }],
                        docs: [{ url: 'https://example.com/doc.pdf', name: 'deed.pdf' }],
                        bhk: '3BHK',
                        size: '1200 sqft'
                    });
                    return true;
                },
                async seedTenderWithBid({ publisherEmail, bidderEmail, bidAmount }) {
                    if (mongoose.connection.readyState === 0) {
                        await mongoose.connect(process.env.MONGO_URI);
                    }
                    const Property = require('./models/property');
                    const User = require('./models/user');
                    const Tender = require('./models/tender');
                    const TenderBid = require('./models/tenderBid');

                    const publisher = await User.findOne({ email: publisherEmail });
                    const bidder = await User.findOne({ email: bidderEmail });

                    if (!publisher || !bidder) throw new Error('Publisher or Bidder not found');

                    // 1. Create Tender (Expired/Closed for bidding, ready for review)
                    const tender = await Tender.create({
                        title: 'Post-Award Test Tender',
                        description: 'Tender for testing awarding flow',
                        dept: 'Engineering',
                        category: 'Civil',
                        type: 'open',
                        createdBy: publisher._id,
                        status: 'published',
                        bidStartAt: new Date(Date.now() - 86400000), // Yesterday
                        bidEndAt: new Date(Date.now() - 3600000),   // 1 hour ago
                        techOpenAt: new Date(Date.now() - 1800000), // 30 mins ago
                        finOpenAt: new Date(Date.now() + 86400000), // Tomorrow (or irrelevant)
                        emdAmount: 5000,
                        docFee: 500,
                        eligibility: { minGrade: 'B', categories: ['Civil'] }
                    });

                    // 2. Create Bid
                    const bid = await TenderBid.create({
                        tenderId: tender._id,
                        vendorId: bidder._id,
                        status: 'submitted',
                        submittedAt: new Date(),
                        techReviewStatus: 'pending',
                        finReviewStatus: 'pending',
                        quotes: { amount: bidAmount || 4500, remarks: 'Best Price' },
                        proposal: { remarks: 'My Proposal' }
                    });

                    return { tenderId: tender._id.toString(), bidId: bid._id.toString() };
                },
                async seedLiveAuction({ sellerEmail, basePrice, title }) {
                    if (mongoose.connection.readyState === 0) {
                        await mongoose.connect(process.env.MONGO_URI);
                    }
                    const Property = require('./models/property');
                    const User = require('./models/user');
                    const seller = await User.findOne({ email: sellerEmail });
                    if (!seller) throw new Error('Seller not found');

                    const property = await Property.create({
                        title: title || 'Live Auction Property',
                        description: 'Prime location for live bidding test',
                        type: 'house',
                        address: '123 Auction St',
                        locationState: 'Kerala',
                        locationDistrict: 'Kochi',
                        basePrice: basePrice || 5000000,
                        sellerId: seller._id,
                        status: 'published',
                        isAuction: true,
                        auctionStartsAt: new Date(Date.now() - 3600000), // Started 1 hour ago
                        auctionEndsAt: new Date(Date.now() + 3600000),   // Ends in 1 hour
                        auctionStep: 10000,
                        auctionReservePrice: 6000000
                    });

                    return property._id.toString();
                },
                async seedWallet({ email, balance }) {
                    if (mongoose.connection.readyState === 0) {
                        await mongoose.connect(process.env.MONGO_URI);
                    }
                    const User = require('./models/user');
                    const Wallet = require('./models/wallet');

                    const user = await User.findOne({ email });
                    if (!user) throw new Error('User not found');

                    let wallet = await Wallet.findOne({ userId: user._id });
                    if (!wallet) {
                        wallet = await Wallet.create({ userId: user._id, balance: balance || 100000 });
                    } else {
                        wallet.balance = balance || 100000;
                        await wallet.save();
                    }
                    return wallet.balance;
                },
                async seedCoupon({ code, type, value, minPurchase }) {
                    if (mongoose.connection.readyState === 0) {
                        await mongoose.connect(process.env.MONGO_URI);
                    }
                    const Coupon = require('./models/coupen');

                    await Coupon.deleteOne({ code }); // Cleanup

                    await Coupon.create({
                        code: code,
                        type: type || 'flat',
                        value: value || 500,
                        minPurchaseAmount: minPurchase || 1000,
                        startsAt: new Date(),
                        expiresAt: new Date(Date.now() + 86400000),
                        usageLimit: 100,
                        isActive: true
                    });
                    return code;
                },
                async seedPayment({ contextId, contextType, email, type, amount }) {
                    if (mongoose.connection.readyState === 0) {
                        await mongoose.connect(process.env.MONGO_URI);
                    }
                    const Payment = require('./models/payment');
                    const User = require('./models/user');

                    const user = await User.findOne({ email });
                    if (!user) throw new Error('User not found for payment seeding');

                    await Payment.create({
                        userId: user._id,
                        amount: amount || 500,
                        currency: 'INR',
                        status: 'success',
                        gateway: 'razorpay',
                        gatewayPaymentId: 'pay_mock_' + Date.now(),
                        gatewayTransactionId: 'order_mock_' + Date.now(),
                        contextType: contextType || 'tender',
                        contextId: contextId,
                        type: type || 'participation_fee',
                        createdAt: new Date()
                    });
                    return true;
                }
            });
            return config;
        },
        viewportWidth: 1280,
        viewportHeight: 720,
        video: false,
        screenshotOnRunFailure: true,
    },
});
