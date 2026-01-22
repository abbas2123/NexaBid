const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const startApp = require('../app');

describe('Minimal startApp Test', () => {
    let app, server;
    let agent;

    beforeAll(async () => {
        const started = await startApp();
        app = started.app;
        server = started.server;
        agent = request.agent(app);
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });

    it('should register, login and create tender', async () => {
        const User = mongoose.model('User');
        const email = 'pub' + Date.now() + '@test.com';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('Password@123', salt);

        const user = await User.create({
            name: 'Pub',
            email: email,
            passwordHash: passwordHash,
            role: 'vendor',
            isVendor: true,
            isVerified: true
        });

        // Verify user in DB immediately
        const userInDb = await User.findById(user._id);
        console.log('[DEBUG] User in DB role:', userInDb.role);

        console.log('[DEBUG] Attempting login for:', email);
        const loginRes = await agent
            .post('/auth/login')
            .send({ email: email, password: 'Password@123' });

        console.log('[DEBUG] Login Status:', loginRes.status);
        if (loginRes.status !== 200) {
            console.log('[DEBUG] Login Body:', JSON.stringify(loginRes.body, null, 2));
        }

        const res = await agent
            .post('/tenders/create')
            .attach('tender_docs', Buffer.from('test'), 'test.txt')
            .field('title', 'Test Tender')
            .field('description', 'Test Description')
            .field('category', 'Category')
            .field('bidLastDate', new Date(Date.now() + 86400000).toISOString());

        console.log('[DEBUG] Create Status:', res.status);
        if (res.status !== 201) {
            console.log('[DEBUG] Create Body:', res.text);
        }
        expect(res.status).toBe(201);
    });
});
