require('dotenv').config();
const mongoose = require('mongoose');
const Tender = require('./models/tender'); // adjust path if needed
const User = require('./models/user');

const seedTenders = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const vendor = await User.findOne({ role: 'vendor' });
    if (!vendor) throw new Error('No admin user found');
const admin = await User.findOne({role:'admin'})
    Tender.deleteMany({createdBy:admin._d})// optional – remove old seed

    const now = new Date();

    const tenders = Array.from({ length: 10 }).map((_, i) => {
      const start = new Date(now.getTime() + i * 86400000);
      const end = new Date(start.getTime() + 3 * 86400000);

      return {
        createdBy: vendor._id,
        title: `Government Road Work Tender ${i + 1}`,
        dept: ['PWD', 'Water Authority', 'Electricity Board'][i % 3],
        category: ['Construction', 'IT', 'Electrical'][i % 3],
        description: 'This is a seeded tender for testing NexaBid flows.',
        eligibility: {
          categories: ['A', 'B', 'C'],
          minGrade: ['A', 'B', 'C'][i % 3],
        },
        type: i % 2 === 0 ? 'open' : 'restricted',
        emdAmount: 5000 + i * 1000,
        docFee: 100 + i * 10,
        publishAt: now,
        bidStartAt: start,
        bidEndAt: end,
        techOpenAt: end,
        finOpenAt: new Date(end.getTime() + 86400000),
        files: [],
        status: 'published',
        version: 1,
      };
    });

    await Tender.insertMany(tenders);
    console.log('✅ 10 tenders seeded successfully!');
    process.exit();
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

seedTenders();
