
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/user');
const Property = require('./models/property');
const Payment = require('./models/payment');
const paymentService = require('./services/payment/paymentService');

const run = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexabid');
        console.log('Connected.');

        const user = await User.findOne();
        if (!user) throw new Error('No user found');
        console.log('User found:', user._id);

        const property = await Property.findOne();
        if (!property) throw new Error('No property found');
        console.log('Property found:', property._id);

        console.log('Testing startInitiatePayment...');
        // Mock user and property
        const payment = await paymentService.startInitiatePayment(user._id, 'property', property._id);

        console.log('Payment result:', payment);
        console.log('Payment ID:', payment._id);

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
