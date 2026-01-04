const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Property = require('./models/property');
const Tender = require('./models/tender');
const User = require('./models/user');

async function seedData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('DB Connected ✔');

    // Delete old data
    await Property.deleteMany({});
    await Tender.deleteMany({});
    console.log('Old mock data deleted ✔');

    // ---------------- USER ---------------
    const sampleUser = await User.findOne();
    if (!sampleUser) {
      console.log('❌ No user found — create at least 1 user first.');
      process.exit();
    }

    // Create a dedicated seller (vendor)
    // ----------- CREATE OR REUSE VENDOR USER ----------
    let seller = await User.findOne({ email: 'vendor@test.com' });

    if (!seller) {
      seller = await User.create({
        name: 'Mock Vendor',
        email: 'vendor@test.com',
        phone: '9998887776',
        passwordHash: 'hashedpassword123',
        role: 'vendor',
      });
      console.log('✔ New vendor created');
    } else {
      console.log('✔ Vendor already exists — using existing vendor');
    }

    // ---------------- PROPERTIES ---------------
    await Property.create([
      {
        title: 'Luxury Villa in Kochi',
        description: 'Beautiful villa near Marine Drive.',
        basePrice: 7500000,
        location: 'Kochi',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-10-20'),
        auctionEndsAt: new Date('2026-10-20'),
        bhk: '2BHK', // e.g. "3BHK"
        size: '100 sqft',
        media: [
          'https://images.pexels.com/photos/259597/pexels-photo-259597.jpeg',
          'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg',
        ],
        isFeatured: true, // ⭐ REQUIRED
        featuredUntil: new Date('2030-01-01'), // ⭐ REQUIRED
      },
      {
        title: '2BHK Flat in Kakkanad',
        description: 'Premium flat near Infopark.',
        basePrice: 4500000,
        location: 'Kakkanad',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-10-20'),
        auctionEndsAt: new Date('2026-10-20'),
        bhk: '2BHK', // e.g. "3BHK"
        size: '100 sqft',
        media: [
          'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg',
          'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg',
        ],
        isFeatured: true, // ⭐ REQUIRED
        featuredUntil: new Date('2030-01-01'), // ⭐ REQUIRED
      },
      {
        title: 'Brototype in Kochi',
        description: 'Brototype in kochi is selling due to BCE231 students',
        basePrice: 45,
        location: 'kochi',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-10-20'),
        auctionEndsAt: new Date('2026-10-20'),
        bhk: '2BHK', // e.g. "3BHK"
        size: '100 sqft',
        media: [
          'https://content.jdmagicbox.com/v2/comp/ernakulam/n5/0484px484.x484.230607161106.d1n5/catalogue/brototype-kochi-kundannoor-ernakulam-computer-software-training-institutes-nhzlnbc7u2-250.jpg',
          'https://content.jdmagicbox.com/v2/comp/ernakulam/n5/0484px484.x484.230607161106.d1n5/catalogue/brototype-kochi-kundannoor-ernakulam-computer-software-training-institutes-nhzlnbc7u2-250.jpg',
        ],
        isFeatured: true, // ⭐ REQUIRED
        featuredUntil: new Date('2030-01-01'), // ⭐ REQUIRED
      },
      {
        title: '3BHK Apartment in Edappally',
        description: 'Spacious modern apartment near Lulu Mall.',
        basePrice: 6200000,
        location: 'Edappally',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-11-12'),
        auctionEndsAt: new Date('2026-11-20'),
        bhk: '3BHK',
        size: '1500 sqft',
        media: [
          'https://images.pexels.com/photos/259950/pexels-photo-259950.jpeg',
          'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg',
        ],
        isFeatured: true,
        featuredUntil: new Date('2030-01-01'),
      },
      {
        title: 'Luxury Beachfront Villa',
        description: 'Beautiful villa with ocean view at Cherai beach.',
        basePrice: 15000000,
        location: 'Cherai',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-10-10'),
        auctionEndsAt: new Date('2026-10-18'),
        bhk: '4BHK',
        size: '3200 sqft',
        media: [
          'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg',
          'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg',
        ],
        isFeatured: true,
        featuredUntil: new Date('2030-01-01'),
      },
      {
        title: '1 Acre Land for Sale',
        description: 'Perfect for commercial or residential development.',
        basePrice: 9000000,
        location: 'Thrissur',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-08-02'),
        auctionEndsAt: new Date('2026-08-10'),
        bhk: null,
        size: '1 Acre',
        media: ['https://images.pexels.com/photos/164005/pexels-photo-164005.jpeg'],
        isFeatured: false,
      },
      {
        title: 'Studio Apartment Near Marine Drive',
        description: 'Compact studio ideal for bachelors.',
        basePrice: 1800000,
        location: 'Marine Drive',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-12-01'),
        auctionEndsAt: new Date('2026-12-05'),
        bhk: '1BHK',
        size: '450 sqft',
        media: ['https://images.pexels.com/photos/1428348/pexels-photo-1428348.jpeg'],
        isFeatured: false,
      },
      {
        title: 'Commercial Space in Kakkanad',
        description: 'Ideal for IT offices near Infopark.',
        basePrice: 8500000,
        location: 'Kakkanad',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-06-15'),
        auctionEndsAt: new Date('2026-06-20'),
        size: '2000 sqft',
        media: ['https://www.99acres.com/universalapp/img/noImageTopaz.png'],
        isFeatured: true,
        featuredUntil: new Date('2030-01-01'),
      },
      {
        title: '5BHK Luxury House in Aluva',
        description: 'Independent villa with private garden.',
        basePrice: 12500000,
        location: 'Aluva',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-09-01'),
        auctionEndsAt: new Date('2026-09-10'),
        bhk: '5BHK',
        size: '2800 sqft',
        media: ['https://images.pexels.com/photos/259962/pexels-photo-259962.jpeg'],
        isFeatured: true,
        featuredUntil: new Date('2030-01-01'),
      },
      {
        title: 'Premium 3BHK at MG Road',
        description: 'Located at the center of Kochi city.',
        basePrice: 6800000,
        location: 'MG Road',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-07-15'),
        auctionEndsAt: new Date('2026-07-22'),
        bhk: '3BHK',
        size: '1600 sqft',
        media: ['https://images.pexels.com/photos/259957/pexels-photo-259957.jpeg'],
        isFeatured: false,
      },
      {
        title: 'Budget Apartment Near Kalamassery',
        description: 'Affordable 1BHK near metro station.',
        basePrice: 2200000,
        location: 'Kalamassery',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-11-05'),
        auctionEndsAt: new Date('2026-11-09'),
        bhk: '1BHK',
        size: '600 sqft',
        media: ['https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg'],
        isFeatured: false,
      },
      {
        title: 'Office Building in Kochi',
        description: '5-floor commercial building.',
        basePrice: 25000000,
        location: 'Kochi',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-03-02'),
        auctionEndsAt: new Date('2026-03-08'),
        size: '10000 sqft',
        media: ['https://images.pexels.com/photos/323705/pexels-photo-323705.jpeg'],
        isFeatured: true,
        featuredUntil: new Date('2030-01-01'),
      },
      {
        title: '3BHK Villa in Kottayam',
        description: 'Independent villa with gated security.',
        basePrice: 5200000,
        location: 'Kottayam',
        sellerId: seller._id,
        auctionStartsAt: new Date('2026-02-10'),
        auctionEndsAt: new Date('2026-02-16'),
        bhk: '3BHK',
        size: '1450 sqft',
        media: ['https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg'],
        isFeatured: false,
      },
    ]);
    console.log('🏡 Properties inserted ✔');

    // ---------------- TENDERS ---------------
    const tenders = [
      {
        title: 'Road Construction Tender',
        description: 'Road repair project in Kerala.',
        dept: 'PWD',
        category: 'Infrastructure',
        basePrice: 2500000,
        location: 'Alappuzha',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'published', // valid value
      },
      {
        title: 'School Building Maintenance',
        description: 'Maintenance for Govt School.',
        dept: 'Education Department',
        category: 'Maintenance',
        basePrice: 1200000,
        location: 'Kollam',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        status: 'published', // valid value
      },
      {
        title: 'Brototype Maintenance',
        description: 'Maintenance for Brocamp.',
        dept: 'Education Department',
        category: 'Maintenance',
        location: 'Kollam',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        status: 'published', // valid value
      },
      {
        title: 'Bridge Construction Project',
        description: 'New bridge construction over Periyar river.',
        dept: 'PWD',
        category: 'Infrastructure',
        location: 'Ernakulam',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 5 * 86400000),
        status: 'published',
      },
      {
        title: 'Hospital Renovation Tender',
        description: 'Renovation of govt hospital wards.',
        dept: 'Health Department',
        category: 'Renovation',
        location: 'Kottayam',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 8 * 86400000),
        status: 'published',
      },
      {
        title: 'Water Supply Pipeline Project',
        description: 'Installation of new water pipelines.',
        dept: 'Water Authority',
        category: 'Infrastructure',
        location: 'Thrissur',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 6 * 86400000),
        status: 'published',
      },
      {
        title: 'Highway Lighting Project',
        description: 'LED street light installation.',
        dept: 'Electricity Board',
        category: 'Electrical',
        location: 'Alappuzha',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 12 * 86400000),
        status: 'published',
      },
      {
        title: 'College Building Construction',
        description: 'New engineering block construction.',
        dept: 'Education Department',
        category: 'Construction',
        location: 'Kollam',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 7 * 86400000),
        status: 'published',
      },
      {
        title: 'Market Road Tarring',
        description: 'Re-tarring of major market road.',
        dept: 'Municipality',
        category: 'Road Works',
        location: 'Kottayam',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 4 * 86400000),
        status: 'published',
      },
      {
        title: 'Drainage Cleaning Tender',
        description: 'City-wide drainage cleaning.',
        dept: 'Corporation',
        category: 'Sanitation',
        location: 'Ernakulam',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 10 * 86400000),
        status: 'published',
      },
      {
        title: 'Smart Classroom Setup',
        description: 'Setting up smart boards in schools.',
        dept: 'Education Department',
        category: 'Electronics',
        location: 'Kollam',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 9 * 86400000),
        status: 'published',
      },
      {
        title: 'Park Development Tender',
        description: 'Development of children’s park.',
        dept: 'Municipality',
        category: 'Construction',
        location: 'Thrissur',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 11 * 86400000),
        status: 'published',
      },
      {
        title: 'Waste Collection Contract',
        description: 'Solid waste pickup & disposal.',
        dept: 'Corporation',
        category: 'Sanitation',
        location: 'Alappuzha',
        userId: seller._id,
        bidEndAt: new Date(Date.now() + 14 * 86400000),
        status: 'published',
      },
    ];

    await Tender.insertMany(tenders);
    console.log('📄 Tenders inserted ✔');

    console.log('\n🌱 SEEDING COMPLETE!');
    process.exit();
  } catch (err) {
    console.error('❌ Seed Error:', err);
    process.exit();
  }
}

seedData();
