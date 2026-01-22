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
                async seedUser({ name, email, password, role }) {
                    if (mongoose.connection.readyState === 0) {
                        await mongoose.connect(process.env.MONGO_URI);
                    }

                    await User.deleteOne({ email });

                    const hash = await bcrypt.hash(password, 10);
                    const user = await User.create({
                        name,
                        email,
                        passwordHash: hash,
                        phone: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
                        role: role || 'vendor',
                        isVendor: true,
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

                    const hash = await bcrypt.hash(password, 10);
                    const admin = await User.create({
                        name: 'E2E Admin',
                        email,
                        passwordHash: hash,
                        role: 'admin',
                        isVerified: true,
                        status: 'active'
                    });
                    return admin.email;
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
