const request = require('supertest');
const mongoose = require('mongoose');
const startApp = require('../app');
const User = require('../models/user');

describe('Even More Minimal Test', () => {
    let app, publisher, publisherCookie;

    beforeAll(async () => {
        app = await startApp();
        publisher = await User.create({
            name: 'Pub',
            email: 'pub' + Date.now() + '@test.com',
            password: 'Password@123',
            role: 'vendor',
            isVendor: true,
            isVerified: true
        });
        const res = await request(app).post('/auth/login').send({ email: publisher.email, password: 'Password@123' });
        publisherCookie = res.headers['set-cookie'];
    });

    afterAll(async () => {
        await User.deleteMany({});
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });

    it('should just hit the status route', async () => {
        const res = await request(app)
            .get('/tenders/') // Just list
            .set('Cookie', publisherCookie);

        console.log('[DEBUG] List Status:', res.status);
        expect(res.status).toBe(200);
    });
});
