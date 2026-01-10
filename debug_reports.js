const mongoose = require('mongoose');
require('./models/user'); // Register User model
const Property = require('./models/property');
require('dotenv').config();

async function debugPropertyReports(userId) {
    try {
        const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error("MONGO_URI is missing in env");
        }
        await mongoose.connect(mongoURI);
        console.log('Connected to DB');

        // Mimic the controller query
        const query = { isAuction: true, sellerId: userId };

        // NOTE: If you are ADMIN, remove sellerId from query. 
        // But since I don't know the user's ID/Role from here easily without login,
        // I will fetch ALL auction properties first to see if ANY are bad.

        console.log('Fetching ALL auction properties to check data integrity...');
        const properties = await Property.find({ isAuction: true })
            .populate('currentHighestBidder')
            .populate('sellerId', 'name email')
            .sort({ auctionEndsAt: -1 })
            .lean();

        console.log(`Found ${properties.length} auction properties.`);

        let errors = [];

        properties.forEach(prop => {
            // Check validation used in EJS
            try {
                if (prop.basePrice === undefined || prop.basePrice === null) {
                    errors.push(`Property ${prop._id} (${prop.title}): Missing basePrice`);
                } else {
                    prop.basePrice.toLocaleString('en-IN');
                }

                if (!prop.auctionEndsAt) {
                    errors.push(`Property ${prop._id} (${prop.title}): Missing auctionEndsAt`);
                } else {
                    new Date(prop.auctionEndsAt).toLocaleDateString();
                }

                if (!prop.auctionStartsAt) {
                    // Not strictly fatal for render if logic handles it, but creating Date object on it might be.
                    // Line 122: const starts=new Date(prop.auctionStartsAt);
                    errors.push(`Property ${prop._id} (${prop.title}): Missing auctionStartsAt`);
                }

            } catch (e) {
                errors.push(`Property ${prop._id} caused error: ${e.message}`);
            }
        });

        if (errors.length > 0) {
            console.error('❌ Data Integrity Issues Found:');
            errors.forEach(e => console.error(e));
        } else {
            console.log('✅ All properties look render-safe.');
        }

        mongoose.disconnect();
    } catch (err) {
        console.error('Script Error:', err);
        mongoose.disconnect();
    }
}

// Run (Hardcoded check or generic)
debugPropertyReports();
