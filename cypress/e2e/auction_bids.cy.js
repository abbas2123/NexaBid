describe('Auction Bidding Flow', () => {
    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    it('should allow a user to place a bid on a live auction', () => {
        const timestamp = Date.now();
        const sellerEmail = `auction_seller_${timestamp}@example.com`;
        const bidderEmail = `bidder_${timestamp}@example.com`;
        const propertyTitle = `Auction Prop ${timestamp}`;

        // 1. Seed Seller
        cy.task('seedUser', {
            name: 'Auction Seller',
            email: sellerEmail,
            password: 'Password@123',
            role: 'vendor',
            isVendor: true
        });

        // 3. Seed Bidder
        cy.task('seedUser', {
            name: 'Bidder User',
            email: bidderEmail,
            password: 'Password@123',
            role: 'user',
            isVendor: false
        });

        // 2. Seed Live Auction Property & Payment
        cy.task('seedLiveAuction', {
            sellerEmail: sellerEmail,
            title: propertyTitle,
            basePrice: 5000
        }).then((propertyId) => {
            // Seed Participation Fee for Bidder
            cy.task('seedPayment', {
                email: bidderEmail,
                contextId: propertyId,
                contextType: 'property',
                type: 'participation_fee',
                amount: 500
            });

            // 4. Login as Bidder
            cy.visit('/auth/login');
            cy.get('#email').type(bidderEmail);
            cy.get('#password').type('Password@123');
            cy.contains('button', 'Log in').click();
            cy.url().should('include', '/auth/dashboard');

            // 5. Navigate to Live Auction directly
            cy.visit(`/auctions/live/${propertyId}`);

            // 6. Place Bid
            // Verify current price (flexible formatting)
            cy.get('#currentBid', { timeout: 10000 }).invoke('text').then((text) => {
                const cleanedText = text.replace(/[^0-9]/g, '');
                expect(cleanedText).to.contain('5000');
            });

            // Enter bid
            cy.get('#bidAmount').type('6000');
            cy.get('#placeBidBtn').click();

            // 7. Verify Success
            cy.get('#currentBid', { timeout: 10000 }).invoke('text').then((text) => {
                const cleanedText = text.replace(/[^0-9]/g, '');
                expect(cleanedText).to.contain('6000');
            });
            cy.get('#bidFeed').invoke('text').then((text) => {
                const cleanedText = text.replace(/[^0-9]/g, '');
                expect(cleanedText).to.contain('6000');
            });
        });
    });
});
