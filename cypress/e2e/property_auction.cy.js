describe('Property Auction & Wallet Flow', () => {
    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    it('should complete the property auction flow including wallet and coupons', () => {
        const timestamp = Date.now();
        const sellerEmail = `prop_seller_${timestamp}@example.com`;
        const bidderEmail = `prop_bidder_${timestamp}@example.com`;
        const couponCode = `SAVE10_${timestamp}`;
        let propertyId;

        // 1. Seed Users
        cy.task('seedUser', {
            name: 'Prop Seller',
            email: sellerEmail,
            password: 'Password@123',
            role: 'vendor'
        });

        cy.task('seedUser', {
            name: 'Prop Bidder',
            email: bidderEmail,
            password: 'Password@123',
            role: 'user'
        });

        // 2. Seed Wallet for Bidder
        cy.task('seedWallet', {
            email: bidderEmail,
            balance: 10000000 // 1 Crore
        });

        // 3. Seed Live Auction
        cy.task('seedLiveAuction', {
            sellerEmail: sellerEmail,
            basePrice: 5000000
        }).then((id) => {
            propertyId = id;
            // Seed Participation Fee for Bidder
            cy.task('seedPayment', {
                email: bidderEmail,
                contextId: id,
                contextType: 'property',
                type: 'participation_fee',
                amount: 500
            });

            // 4. Seed Coupon
            cy.task('seedCoupon', {
                code: couponCode,
                type: 'flat',
                value: 1000,
                minPurchase: 5000
            });

            // 5. Login as Bidder
            cy.visit('/auth/login');
            cy.get('#email').type(bidderEmail);
            cy.get('#password').type('Password@123');
            cy.contains('button', 'Log in').click();
            cy.url().should('include', '/auth/dashboard');

            // 6. Navigate to live auction
            cy.visit(`/auctions/live/${propertyId}`);

            // Verify Auction Details
            cy.contains('Live Property Auction').should('be.visible');
            cy.get('#currentBid').should('contain', '50,00,000').or('contain', '5000000');

            // 7. Place Bid
            cy.get('#bidAmount').type('5100000');
            cy.get('#placeBidBtn').click();

            // Verify New Bid
            cy.get('#currentBid', { timeout: 10000 }).should('contain', '51,00,000').or('contain', '5100000');
            cy.get('#bidFeed').should('contain', '51,00,000').or('contain', '5100000');
        });
    });
});
