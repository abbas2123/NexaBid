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
            role: 'vendor',
            isVendor: true
        });

        // 2. Seed Live Auction Property
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        cy.task('seedProperty', {
            sellerEmail: sellerEmail,
            title: propertyTitle,
            basePrice: 5000,
            isAuction: true,
            auctionStartsAt: new Date().toISOString(), // Started now
            auctionEndsAt: tomorrow.toISOString(),
            status: 'published',
            verificationStatus: 'approved'
        });

        // 3. Seed Bidder
        cy.task('seedUser', {
            name: 'Bidder User',
            email: bidderEmail,
            password: 'Password@123',
            role: 'user',
            isVendor: false
        });

        // 4. Login as Bidder
        cy.visit('/auth/login');
        cy.get('#email').type(bidderEmail);
        cy.get('#password').type('Password@123');
        cy.contains('button', 'Login').click();
        cy.url().should('include', '/auth/dashboard');

        // 5. Navigate to Auctions
        cy.visit('/auctions'); // Assuming this is the public auction list
        cy.contains(propertyTitle).click(); // Click to view details

        // 6. Place Bid
        // Verify current price
        cy.contains('5000').should('exist');

        // Enter bid
        // Need to find bid input. Selector might be 'input[name="amount"]'
        cy.get('input[name="amount"]').type('6000');
        cy.contains('button', 'Place Bid').click();

        // 7. Verify Success
        cy.contains('Bid placed successfully').should('be.visible');
        cy.contains('6000').should('exist'); // New highest bid
    });
});
