require('dotenv').config();
const mongoose = require('mongoose');
const adminAuthService = require('../services/admin/authService');
require('../models/user');
require('../models/property');
require('../models/tender');
require('../models/vendorApplication');

async function debugStats() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ DB Connected');

    console.log('--- FETCHING DASHBOARD STATS (Monthly) ---');
    try {
        const stats = await adminAuthService.getDashboardStats({ timeframe: 'monthly' });
        console.log('Labels:', stats.labels);
        console.log('User Stats:', stats.userStats);
        console.log('Tender Stats:', stats.tenderStats);
        console.log('Property Stats:', stats.propertyStats);
        console.log('Vendor Stats:', stats.vendorStats);

        // Check raw counts
        const User = require('../models/user');
        const totalUsers = await User.countDocuments();
        console.log('Total Users in DB:', totalUsers);

        const lastUser = await User.findOne().sort({ createdAt: -1 });
        console.log('Last User Created At:', lastUser?.createdAt);

    } catch (error) {
        console.error('Error fetching stats:', error);
    } finally {
        process.exit();
    }
}

debugStats();
