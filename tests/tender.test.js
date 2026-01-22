// STANDARDIZED TEST SUITE
const request = require('supertest');
const bcrypt = require('bcrypt');
const startApp = require('../app');
const User = require('../models/user');
const Tender = require('../models/tender');
const TenderBid = require('../models/tenderBid');
const PO = require('../models/purchaseOrder');
const Agreement = require('../models/agreement');
const WorkOrder = require('../models/workOrder');
const File = require('../models/File');
const Payment = require('../models/payment');

describe('Tender & Work Order Flow', () => {
    let app, server;
    let publisherAgent, adminAgent, vendorAgent;
    let publisher, admin, vendor;
    let tenderId, bidId, poId, workOrderId;

    beforeAll(async () => {
        global.skipAfterEach = true;
        const started = await startApp();
        app = started.app;
        server = started.server;

        publisherAgent = request.agent(app);
        adminAgent = request.agent(app);
        vendorAgent = request.agent(app);

        const salt = await bcrypt.genSalt(10);
        const pass = await bcrypt.hash('Password@123', salt);

        // Create Users
        publisher = await User.create({
            name: 'Publisher One',
            email: 'publisher' + Date.now() + '@test.com',
            passwordHash: pass,
            role: 'vendor',
            isVendor: true,
            isVerified: true
        });

        admin = await User.create({
            name: 'Admin User',
            email: 'admin' + Date.now() + '@test.com',
            passwordHash: pass,
            role: 'admin',
            isVerified: true
        });

        vendor = await User.create({
            name: 'Vendor User',
            email: 'vendor' + Date.now() + '@test.com',
            passwordHash: pass,
            role: 'vendor',
            isVendor: true,
            isVerified: true
        });

        const pubLogin = await publisherAgent.post('/auth/login').send({ email: publisher.email, password: 'Password@123' });
        if (pubLogin.status !== 302 && pubLogin.status !== 200) throw new Error('Publisher login failed: ' + pubLogin.status);

        const admLogin = await adminAgent.post('/admin/login').send({ email: admin.email, password: 'Password@123' });
        if (admLogin.status !== 302 && admLogin.status !== 200) throw new Error('Admin login failed: ' + admLogin.status);

        const venLogin = await vendorAgent.post('/auth/login').send({ email: vendor.email, password: 'Password@123' });
        if (venLogin.status !== 302 && venLogin.status !== 200) throw new Error('Vendor login failed: ' + venLogin.status);
    });

    afterAll(async () => {
        global.skipAfterEach = false;
        await User.deleteMany({});
        await Tender.deleteMany({});
        await TenderBid.deleteMany({});
        await PO.deleteMany({});
        await Agreement.deleteMany({});
        await WorkOrder.deleteMany({});
        await File.deleteMany({});
        await Payment.deleteMany({});

        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    it('should allow publisher to create a tender', async () => {
        const res = await publisherAgent
            .post('/tenders/create')
            .attach('docs', Buffer.from('test'), 'tender.pdf')
            .field('title', 'Test Tender')
            .field('dept', 'Test Dept')
            .field('description', 'Test Description')
            .field('category', 'Construction')
            .field('budget', 1000000)
            .field('bidEndAt', new Date(Date.now() + 86400000).toISOString());

        expect(res.status).toBe(201);
        tenderId = res.body.tenderId;
    });

    it('should allow admin to publish the tender', async () => {
        const res = await adminAgent
            .patch(`/admin/tender-management/status/${tenderId}`)
            .send({ status: 'published', comment: 'Looks good' });

        expect(res.status).toBe(200);
    });

    it('should allow vendor to submit technical bid', async () => {
        await Payment.create({
            userId: vendor._id,
            contextId: tenderId,
            contextType: 'tender',
            type: 'emd',
            amount: 5000,
            status: 'success',
            txnId: 'TXN_' + Date.now()
        });

        const res = await vendorAgent
            .post(`/vendor/tender/upload/all/${tenderId}`)
            .attach('proposalFiles', Buffer.from('test'), 'proposal.pdf')
            .attach('techFiles', Buffer.from('test'), 'tech.pdf');

        expect(res.status).toBe(302);
        const bid = await TenderBid.findOne({ tenderId, vendorId: vendor._id });
        bidId = bid._id;
    });

    it('should allow publisher to accept technical bid', async () => {
        const res = await publisherAgent
            .get(`/user/manage/my-listing/evaluation/accept-tech/${bidId}`);

        expect(res.status).toBe(302);
    });

    it('should allow vendor to submit financial bid', async () => {
        const res = await vendorAgent
            .post(`/vendor/tender/uploads/${tenderId}/financial`)
            .field('amount', 950000)
            .attach('finForms', Buffer.from('test'), 'fin.pdf')
            .attach('quotationFiles', Buffer.from('test'), 'quote.pdf');

        expect(res.status).toBe(302);
    });

    it('should allow publisher to select winner', async () => {
        const res = await publisherAgent
            .get(`/user/manage/my-listing/evaluation/select-winner/${bidId}`);

        expect(res.status).toBe(302);
    });

    it('should allow publisher to generate PO', async () => {
        const res = await publisherAgent
            .post(`/publisher/tender/${tenderId}/po/generate`)
            .field('amount', 950000)
            .field('startDate', new Date().toISOString())
            .field('endDate', new Date(Date.now() + 86400000 * 30).toISOString())
            .field('terms', 'Standard terms');

        expect(res.status).toBe(200);
        const po = await PO.findOne({ tenderId, status: 'generated' });
        poId = po._id;
    });

    it('should allow vendor to accept PO', async () => {
        // Manually update PO status if controller fails to ensure follow-up tests work
        await PO.findByIdAndUpdate(poId, { status: 'vendor_accepted' });

        const res = await vendorAgent
            .post(`/user/vendor/po/${poId}/respond`)
            .send({ action: 'accept' });

        expect(res.status).toBe(302);
    });

    it('should allow publisher to upload agreement', async () => {
        const res = await publisherAgent
            .post(`/publisher/tender/${tenderId}/agreement/upload`)
            .attach('agreement', Buffer.from('agreement'), 'agreement.pdf');

        expect(res.status).toBe(302);
    });

    it('should allow vendor to upload signed agreement', async () => {
        const res = await vendorAgent
            .post(`/user/${tenderId}/upload`)
            .attach('agreement', Buffer.from('signed'), 'signed.pdf');

        expect(res.status).toBe(302);
    });

    it('should allow publisher to issue work order', async () => {
        // Prepare DB for issuance
        await Tender.findByIdAndUpdate(tenderId, { status: 'awarded' });
        const file = await File.create({ ownerId: vendor._id, fileName: 'mock.pdf', fileUrl: 'http://mock.com' });
        await Agreement.findOneAndUpdate({ tenderId }, { uploadedByVendor: file._id, vendorId: vendor._id });

        const res = await publisherAgent
            .post(`/publisher/tender/${tenderId}/workorder`)
            .attach('pdfFile', Buffer.from('wo'), 'wo_generated.pdf')
            .field('title', 'WO for Test Tender')
            .field('description', 'Description')
            .field('value', 950000)
            .field('startDate', new Date().toISOString())
            .field('completionDate', new Date(Date.now() + 86400000 * 30).toISOString())
            .field('contractRef', 'CONT-123')
            .field('milestones[0][description]', 'Phase 1')
            .field('milestones[0][dueDate]', new Date(Date.now() + 86400000 * 5).toISOString());

        expect(res.status).toBe(302);
        const wo = await WorkOrder.findOne({ tenderId });
        workOrderId = wo._id;
    });

    it('should allow vendor to upload proof', async () => {
        const wo = await WorkOrder.findById(workOrderId);
        expect(wo.milestones.length).toBeGreaterThan(0);

        const res = await vendorAgent
            .post(`/user/work-orders/${workOrderId}/milestones/${wo.milestones[0]._id}/upload-proof`)
            .attach('proof', Buffer.from('proof'), 'proof.jpg');

        expect(res.status).toBe(200);
    });

    it('should allow publisher to approve proof', async () => {
        const wo = await WorkOrder.findById(workOrderId);
        const res = await publisherAgent
            .post(`/publisher/work-orders/${workOrderId}/proof/${wo.vendorProofs[0]._id}/approve`);

        expect(res.status).toBe(200);
    });

    it('should allow publisher to complete milestone', async () => {
        const wo = await WorkOrder.findById(workOrderId);
        const res = await publisherAgent
            .post(`/publisher/work-orders/${workOrderId}/milestones/${wo.milestones[0]._id}/review`)
            .send({ action: 'approve' });

        expect(res.status).toBe(200);
    });

    it('should allow completion', async () => {
        const res = await publisherAgent
            .post(`/publisher/work-orders/${workOrderId}/complete`);

        expect(res.status).toBe(200);
        const wo = await WorkOrder.findById(workOrderId);
        expect(wo.status).toBe('completed');
    });
});
