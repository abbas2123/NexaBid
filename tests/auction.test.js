const startApp = require("../app");
const User = require("../models/user");
const Property = require("../models/property");
const PropertyBid = require("../models/propertyBid");
const Payment = require("../models/payment");
const auctionSocket = require("../socket/auctionSocket");

describe("Auction & Bidding Logic", () => {
    let seller, bidder, property;
    let mockIo, mockSocket;

    beforeAll(async () => {
        await startApp();
    });

    beforeEach(async () => {

        // Create test users
        seller = await User.create({
            name: "Seller User",
            email: "seller@test.com",
            phone: "1111111111",
            role: "vendor",
            status: "active"
        });

        bidder = await User.create({
            name: "Bidder User",
            email: "bidder@test.com",
            phone: "2222222222",
            role: "user",
            status: "active"
        });

        // Create a live auction property
        property = await Property.create({
            sellerId: seller._id,
            title: "Test Auction Property",
            basePrice: 100000,
            isAuction: true,
            auctionStartsAt: new Date(Date.now() - 3600000), // Started 1h ago
            auctionEndsAt: new Date(Date.now() + 3600000),   // Ends in 1h
            status: "published",
            verificationStatus: "approved"
        });

        // Mock Socket infrastructure
        mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        };
        mockSocket = {
            user: bidder,
            id: "test-socket-id",
            join: jest.fn(),
            emit: jest.fn(),
            on: jest.fn()
        };
    });

    describe("Manual Bidding Logic (via Socket)", () => {
        it("should reject bid if participation fee is not paid", async () => {
            const socketHandler = auctionSocket;

            let placeBidHandler;
            mockSocket.on = jest.fn((event, handler) => {
                if (event === 'place_bid') placeBidHandler = handler;
            });

            socketHandler(mockIo, mockSocket);

            await placeBidHandler({ propertyId: property._id.toString(), amount: 110000 });

            expect(mockSocket.emit).toHaveBeenCalledWith("bid_error", expect.objectContaining({
                message: "PAYMENT_REQUIRED"
            }));
        });

        it("should accept bid if participation fee is paid", async () => {
            // Create successful participation payment
            await Payment.create({
                userId: bidder._id,
                contextId: property._id,
                contextType: "property",
                type: "participation_fee",
                amount: 1000,
                status: "success"
            });

            const socketHandler = auctionSocket;
            let placeBidHandler;
            mockSocket.on = jest.fn((event, handler) => {
                if (event === 'place_bid') placeBidHandler = handler;
            });

            socketHandler(mockIo, mockSocket);

            await placeBidHandler({ propertyId: property._id.toString(), amount: 120000 });

            // Verify Property update
            const updatedProperty = await Property.findById(property._id);
            expect(updatedProperty.currentHighestBid).toBe(120000);
            expect(updatedProperty.currentHighestBidder.toString()).toBe(bidder._id.toString());

            // Verify Bid entry
            const bid = await PropertyBid.findOne({ propertyId: property._id, bidderId: bidder._id });
            expect(bid.amount).toBe(120000);
            expect(bid.bidStatus).toBe("active");

            // Verify Socket broadcast
            expect(mockIo.to).toHaveBeenCalledWith(`auction_${property._id}`);
            expect(mockIo.emit).toHaveBeenCalledWith("new_bid", expect.objectContaining({
                amount: 120000,
                bidderId: bidder._id.toString()
            }));
        });

        it("should reject bid lower than current highest", async () => {
            // Must have payment first
            await Payment.create({
                userId: bidder._id,
                contextId: property._id,
                contextType: "property",
                type: "participation_fee",
                amount: 1000,
                status: "success"
            });

            // Set current highest bid on property
            await Property.findByIdAndUpdate(property._id, {
                currentHighestBid: 120000,
                currentHighestBidder: seller._id // someone else
            });

            const socketHandler = auctionSocket;
            let placeBidHandler;
            mockSocket.on = jest.fn((event, handler) => {
                if (event === 'place_bid') placeBidHandler = handler;
            });

            socketHandler(mockIo, mockSocket);

            // Attempt bid lower than 120000
            await placeBidHandler({ propertyId: property._id.toString(), amount: 115000 });

            expect(mockSocket.emit).toHaveBeenCalledWith("bid_error", expect.objectContaining({
                message: "BID_TOO_LOW"
            }));
        });
    });
});
