require('dotenv').config();
const mongoose = require('mongoose');
const Property = require('../models/property');
require('../models/user'); // Ensure User model is registered
const User = require('../models/user');
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  // await Property.deleteMany({});

  const now = new Date();
  const addDays = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const subDays = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const seller = await User.findOne();
  if (!seller) {
    console.log('No user found. Please run scripts/createAdmin.js first.');
    process.exit(1);
  }
  const sellerId = seller._id;

  const properties = [
    {
      sellerId,
      title: '3 BHK Premium Villa',
      description: 'Independent luxury villa with garden & parking',
      type: 'house',
      address: 'Kayamkulam, Alappuzha',
      locationState: 'Kerala',
      locationDistrict: 'Alappuzha',
      geoLat: 9.1826,
      geoLng: 76.5317,
      bhk: 3,
      size: 1850,
      isAuction: true,
      basePrice: 5500000,
      auctionStep: 25000,
      auctionReservePrice: 6000000,
      auctionStartsAt: subDays(2), // Live now
      auctionEndsAt: addDays(5),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071&auto=format&fit=crop',
        },
      ], // Modern Villa
      docs: [{ url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
      status: 'published',
      verificationStatus: 'approved',
      verificationRequestedAt: subDays(10),
    },
    {
      sellerId,
      title: 'Commercial Highway Plot',
      description: 'Roadside commercial land',
      type: 'commercial',
      address: 'NH 66, Kayamkulam',
      locationState: 'Kerala',
      locationDistrict: 'Alappuzha',
      geoLat: 9.1865,
      geoLng: 76.5341,
      size: 3200,
      isAuction: true,
      basePrice: 7200000,
      auctionStep: 50000,
      auctionReservePrice: 8000000,
      auctionStartsAt: addDays(2), // Upcoming
      auctionEndsAt: addDays(10),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1542621334-a254cf47733d?q=80&w=2069&auto=format&fit=crop',
        },
      ], // Commercial Land
      docs: [{ url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
      status: 'published',
      verificationStatus: 'approved',
      verificationRequestedAt: subDays(5),
    },
    {
      sellerId,
      title: '2 BHK Lake View Apartment',
      description: 'Apartment facing Kayamkulam lake',
      type: 'apartment',
      address: 'Kayamkulam Lake Road',
      locationState: 'Kerala',
      locationDistrict: 'Alappuzha',
      geoLat: 9.1841,
      geoLng: 76.5302,
      bhk: 2,
      size: 1250,
      isAuction: true,
      basePrice: 4200000,
      auctionStep: 20000,
      auctionReservePrice: 4700000,
      auctionStartsAt: subDays(1), // Live now
      auctionEndsAt: addDays(4),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1512918760383-eda2723ad6e1?q=80&w=2070&auto=format&fit=crop',
        },
      ], // Lake Apartment
      docs: [{ url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
      status: 'published',
      verificationStatus: 'approved',
      verificationRequestedAt: subDays(7),
    },
    {
      sellerId,
      title: 'Modern Duplex House',
      description: 'Newly built duplex home',
      type: 'house',
      address: 'Haripad',
      locationState: 'Kerala',
      locationDistrict: 'Alappuzha',
      geoLat: 9.2584,
      geoLng: 76.4647,
      bhk: 4,
      size: 2100,
      isAuction: true,
      basePrice: 6800000,
      auctionStep: 30000,
      auctionReservePrice: 7500000,
      auctionStartsAt: subDays(3), // Live now
      auctionEndsAt: addDays(4),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2080&auto=format&fit=crop',
        },
      ], // Duplex House
      docs: [{ url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
      status: 'published',
      verificationStatus: 'approved',
      verificationRequestedAt: subDays(10),
    },
    {
      sellerId,
      title: 'Beach Side Cottage',
      description: 'Cottage near Alappuzha beach',
      type: 'house',
      address: 'Alappuzha Beach',
      locationState: 'Kerala',
      locationDistrict: 'Alappuzha',
      geoLat: 9.4947,
      geoLng: 76.3274,
      bhk: 2,
      size: 950,
      isAuction: true,
      basePrice: 5000000,
      auctionStep: 20000,
      auctionReservePrice: 5500000,
      auctionStartsAt: addDays(1), // Upcoming
      auctionEndsAt: addDays(6),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=2070&auto=format&fit=crop',
        },
      ], // Beach House
      docs: [{ url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
      status: 'published',
      verificationStatus: 'approved',
      verificationRequestedAt: subDays(5),
    },
    {
      sellerId,
      title: 'Hill View Land',
      description: 'Scenic hill facing land',
      type: 'land',
      address: 'Mavelikara',
      locationState: 'Kerala',
      locationDistrict: 'Alappuzha',
      geoLat: 9.2667,
      geoLng: 76.5589,
      size: 5400,
      isAuction: true,
      basePrice: 3800000,
      auctionStep: 15000,
      auctionReservePrice: 4200000,
      auctionStartsAt: subDays(2), // Live now
      auctionEndsAt: addDays(3),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2832&auto=format&fit=crop',
        },
      ], // Land View
      docs: [{ url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
      status: 'published',
      verificationStatus: 'approved',
      verificationRequestedAt: subDays(8),
    },
    {
      sellerId,
      title: 'City Center Shop',
      description: 'Retail shop in city center',
      type: 'commercial',
      address: 'Alappuzha Town',
      locationState: 'Kerala',
      locationDistrict: 'Alappuzha',
      geoLat: 9.4981,
      geoLng: 76.3388,
      size: 600,
      isAuction: true,
      basePrice: 2500000,
      auctionStep: 10000,
      auctionReservePrice: 2800000,
      auctionStartsAt: subDays(5), // Live now (ending soon)
      auctionEndsAt: addDays(1),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
        },
      ], // Shop Front
      docs: [{ url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
      status: 'published',
      verificationStatus: 'approved',
      verificationRequestedAt: subDays(15),
    },
    {
      sellerId,
      title: 'Farm Land Plot',
      description: 'Agricultural land',
      type: 'land',
      address: 'Chengannur',
      locationState: 'Kerala',
      locationDistrict: 'Alappuzha',
      geoLat: 9.3185,
      geoLng: 76.6151,
      size: 7000,
      isAuction: true,
      basePrice: 3000000,
      auctionStep: 15000,
      auctionReservePrice: 3400000,
      auctionStartsAt: addDays(3), // Upcoming
      auctionEndsAt: addDays(10),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?q=80&w=2071&auto=format&fit=crop',
        },
      ], // Farmland
      docs: [{ url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
      status: 'published',
      verificationStatus: 'approved',
      verificationRequestedAt: subDays(2),
    },
    {
      sellerId,
      title: 'Luxury Penthouse',
      description: 'Top floor penthouse with lake view',
      type: 'apartment',
      address: 'Kuttanad',
      locationState: 'Kerala',
      locationDistrict: 'Alappuzha',
      geoLat: 9.3875,
      geoLng: 76.4175,
      bhk: 3,
      size: 1900,
      isAuction: true,
      basePrice: 9000000,
      auctionStep: 40000,
      auctionReservePrice: 9800000,
      auctionStartsAt: subDays(0), // Starts now
      auctionEndsAt: addDays(7),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2080&auto=format&fit=crop',
        },
      ], // Luxury Interior
      docs: [{ url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
      status: 'published',
      verificationStatus: 'approved',
      verificationRequestedAt: subDays(1),
    },
    {
      sellerId,
      title: 'Warehouse Godown',
      description: 'Large warehouse near NH',
      type: 'commercial',
      address: 'Ambalappuzha',
      locationState: 'Kerala',
      locationDistrict: 'Alappuzha',
      geoLat: 9.3892,
      geoLng: 76.3401,
      size: 5000,
      isAuction: true,
      basePrice: 6500000,
      auctionStep: 30000,
      auctionReservePrice: 7200000,
      auctionStartsAt: addDays(5), // Upcoming
      auctionEndsAt: addDays(12),
      media: [
        {
          url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop',
        },
      ], // Warehouse
    },
  ];

  await Property.insertMany(properties);
  console.log('✅ 10 Properties seeded successfully');
  process.exit();
}

seed();
