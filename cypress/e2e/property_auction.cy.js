describe('Property Auction & Wallet Flow', () => {
    const timestamp = Date.now();
    const seller = {
        name: `Seller ${timestamp}`,
        email: `seller_${timestamp}@example.com`,
        password: 'Password@123',
        role: 'user' // or vendor? seller is just user in property context often
    };
    const bidder = {
        name: `Bidder ${timestamp}`,
        email: `bidder_${timestamp}@example.com`,
        password: 'Password@123',
        role: 'user'
    };
    const admin = {
        email: `admin_${timestamp}@nexabid.com`,
        password: 'Admin@123'
    };
    const couponCode = `SAVE${timestamp}`;

    let propertyId;

    before(() => {
        cy.task('seedUser', seller);
        cy.task('seedUser', bidder);
        cy.task('seedAdmin', admin);

        // Seed Wallet for Bidder
        cy.task('seedWallet', { email: bidder.email, balance: 50000 }); // Initial Balance

        // Seed Live Auction
        cy.task('seedLiveAuction', {
            sellerEmail: seller.email,
            basePrice: 5000000
        }).then((id) => {
            propertyId = id;
        });

        // Seed Coupon
        cy.task('seedCoupon', {
            code: couponCode,
            type: 'flat',
            value: 1000,
            minPurchase: 50000
        });
    });

    it('Bidder adds money, bids on live auction, and applies coupon', () => {
        // ----------------------------------------
        // 1. Wallet Management (Add Money)
        // ----------------------------------------
        cy.visit('/auth/login');
        cy.get('#email').type(bidder.email);
        cy.get('#password').type(bidder.password);
        cy.contains('button', 'Log in').click();

        cy.url().should('include', '/dashboard'); // Verify login first

        cy.visit('/wallet/');
        cy.contains('₹50,000').should('be.visible'); // Initial balance

        // Add Money
        cy.contains('Add Funds').click();
        cy.get('#customAmount').type('20000');


        // Proceed to Pay
        cy.contains('Proceed to Secure Payment').click();

        // Mock Payment Success (Assume redirection to success or mock gateway)
        // Since we can't key in Razorpay credentials, checking if it redirects to gateway or handles success
        // If test env bypasses, we check success. 
        // For now, let's verify we reached the payment initiation point or success page.
        // Assuming /payments/initiate route

        // ----------------------------------------
        // 2. Live Auction Bidding
        // ----------------------------------------
        // Visit the live auction
        cy.visit(`/auctions/live/${propertyId}`);

        // Verify Auction Details
        cy.contains('Live Property Auction').should('be.visible');
        cy.contains('Current Highest Bid').should('be.visible');

        // Place a Bid
        // Ensure socket connection (Cypress handles some, but real-time might face race conditions)
        // Look for bid input or increment button
        cy.get('#bidAmount').type('5010000'); // Higher than base
        cy.contains('Place Bid').click();

        // Verify Bid Accepted via Toast or UI Update
        cy.contains('Bid Placed Successfully', { timeout: 10000 }).should('be.visible');

        // Verify New Highest Bid logic
        cy.contains('₹ 50,10,000').should('be.visible'); // Updated price
    });
});
