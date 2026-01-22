const request = require('supertest');
const express = require('express');

describe('Standalone App Test', () => {
    let app;
    beforeAll(() => {
        app = express();
        app.get('/test', (req, res) => res.status(200).send('ok'));
    });

    it('should hit a simple GET', async () => {
        const res = await request(app).get('/test');
        expect(res.status).toBe(200);
        expect(res.text).toBe('ok');
    });
});
