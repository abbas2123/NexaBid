require('dotenv').config();
const mongoose = require('mongoose');
const Tender = require('../models/tender');
require('../models/user'); // Register User model

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    await Tender.deleteMany({});
    console.log('Cleared existing tenders');

    const admin = await mongoose.model('User').findOne();
    if (!admin) {
        console.log('No user found! Please run createAdmin.js first.');
        process.exit(1);
    }

    const now = new Date();
    const addDays = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const subDays = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const tenders = [
        {
            createdBy: admin._id,
            title: 'Road Construction NH-66',
            dept: 'Public Works Department (PWD)',
            category: 'Civil Works',
            description: 'Widening and resurfacing of National Highway 66 stretch.',
            type: 'open',
            emdAmount: 500000,
            docFee: 5000,
            publishAt: subDays(5),
            bidStartAt: subDays(2),
            bidEndAt: addDays(10), // Active
            techOpenAt: addDays(11),
            finOpenAt: addDays(13),
            status: 'published',
            version: 1,
        },
        {
            createdBy: admin._id,
            title: 'School Building Renovation',
            dept: 'Education Department',
            category: 'Construction',
            description: 'Renovation of Govt High School block including roofing and wiring.',
            type: 'open',
            emdAmount: 50000,
            docFee: 1000,
            publishAt: subDays(10),
            bidStartAt: subDays(5),
            bidEndAt: addDays(2), // Ending soon
            techOpenAt: addDays(3),
            finOpenAt: addDays(5),
            status: 'published',
            version: 1,
        },
        {
            createdBy: admin._id,
            title: 'Supply of Medical Equipment',
            dept: 'Health Department',
            category: 'Procurement',
            description: 'Supply of MRI machines and X-Ray units for District Hospital.',
            type: 'open',
            emdAmount: 150000,
            docFee: 2500,
            publishAt: subDays(2),
            bidStartAt: addDays(1), // Upcoming
            bidEndAt: addDays(15),
            techOpenAt: addDays(16),
            finOpenAt: addDays(18),
            status: 'published',
            version: 1,
        },
        {
            createdBy: admin._id,
            title: 'City Waste Management System',
            dept: 'Municipal Corporation',
            category: 'Services',
            description: 'Contract for daily waste collection and processing.',
            type: 'open',
            emdAmount: 200000,
            docFee: 3000,
            publishAt: subDays(20),
            bidStartAt: subDays(15),
            bidEndAt: subDays(1), // Closed/Evaluation
            techOpenAt: subDays(0),
            finOpenAt: addDays(2),
            status: 'published', // Or 'closed' depending on logic, keeping published to show as past/eval
            version: 1,
        },
        {
            createdBy: admin._id,
            title: 'IT Infrastructure Upgrade',
            dept: 'IT Department',
            category: 'Technology',
            description: 'Supply and installation of servers and networking gear.',
            type: 'restricted',
            emdAmount: 100000,
            docFee: 2000,
            publishAt: subDays(1),
            bidStartAt: subDays(0), // Starts today
            bidEndAt: addDays(7),
            techOpenAt: addDays(8),
            finOpenAt: addDays(10),
            status: 'published',
            version: 1,
        },
    ];

    await Tender.insertMany(tenders);
    console.log('✅ 5 Tenders seeded successfully');
    process.exit();
}

seed();
