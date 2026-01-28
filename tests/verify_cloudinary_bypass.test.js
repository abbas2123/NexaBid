const mongoose = require('mongoose');

// Mock isTestEnv to be false to verify the specific filename bypass for dev/prod environments
// This must be done before requiring the service
jest.mock('../utils/isTestEnv', () => false);

const TenderBid = require('../models/tenderBid');
const File = require('../models/File');
const tenderBidService = require('../services/tender/tenderBid');

describe('Cloudinary Bypass Logic', () => {
    let userId;
    let tenderId;

    beforeEach(async () => {
        userId = new mongoose.Types.ObjectId();
        tenderId = new mongoose.Types.ObjectId();

        // Ensure clean state
        await TenderBid.deleteMany({});
        await File.deleteMany({});

        // Create initial bid
        await TenderBid.create({ tenderId, vendorId: userId });
    });

    it('should bypass Cloudinary when filename starts with TEST_MOCK_ even in non-test (mocked) environment', async () => {
        const files = {
            finForms: [{
                originalname: 'TEST_MOCK_fin_form.pdf',
                filename: 'TEST_MOCK_fin_form.pdf',
                path: '/tmp/test.pdf',
                mimetype: 'application/pdf',
                size: 1024,
                buffer: Buffer.from('mock content')
            }]
        };

        // If the bypass logic works, it will skip Cloudinary and use 'http://mock-url.com/...'
        await tenderBidService.uploadFinancial(tenderId, userId, files, 4000);

        // Verify File created with mock URL
        const file = await File.findOne({ fileName: 'TEST_MOCK_fin_form.pdf' });

        expect(file).toBeDefined();
        expect(file).not.toBeNull();
        if (file) {
            expect(file.fileUrl).toContain('mock-url.com');
            expect(file.fileUrl).toContain('TEST_MOCK_fin_form.pdf');
        }
    });
});
