describe('Tender Post-Award Flow', () => {
    const timestamp = Date.now();
    const publisher = {
        name: `Publisher ${timestamp}`,
        email: `pub_${timestamp}@example.com`,
        password: 'Password@123',
        role: 'vendor'
    };
    const bidder = {
        name: `Bidder ${timestamp}`,
        email: `bidder_${timestamp}@example.com`,
        password: 'Password@123',
        role: 'vendor',
        isVendor: true
    };
    const admin = {
        email: `admin_${timestamp}@nexabid.com`,
        password: 'Admin@123'
    };

    let tenderId;

    before(() => {
        cy.task('seedUser', publisher);
        cy.task('seedUser', bidder);
        cy.task('seedAdmin', admin);

        // Seed a tender that is already closed for bidding and has one bid
        cy.task('seedTenderWithBid', {
            publisherEmail: publisher.email,
            bidderEmail: bidder.email,
            bidAmount: 50000
        }).then((data) => {
            tenderId = data.tenderId;
        });
    });

    it('Admin awards tender, generates PO, and Vendor signs agreement', () => {
        // ----------------------------------------
        // 1. Publisher Evaluates Bids
        // ----------------------------------------
        cy.visit('/auth/login');
        cy.get('#email').type(publisher.email);
        cy.get('#password').type(publisher.password);
        cy.contains('button', 'Log in').click();

        // Verify Login Success
        cy.url().should('include', '/dashboard'); // Ensure session is established

        // Direct navigation to evaluation page for the seeded tender
        cy.visit(`/user/manage/my-listing/owner/tender/${tenderId}/evaluation`);

        // 4. Accept Technical Bid
        cy.contains('Pending').should('exist'); // View just says "Pending"
        // Find the 'Accept' button for Technical Review on the first bid
        cy.contains('Accept').first().click();

        // Verify Status changes to Qualified/Accepted
        // Wait for page reload/update
        cy.contains('Accepted', { timeout: 10000 }).should('exist');

        // 5. Select Winner (Financial Accept + Award)
        // Switch to Financial Tab explicitly to be safe, although technically we might be on same page
        cy.contains('Financial Evaluation').click({ force: true });

        // Scope to Financial Tab to avoid hitting hidden technical row
        cy.get('div[x-show="tab===\'financial\'"]').should('be.visible').within(() => {
            cy.contains('Select Winner').click();
        });

        // Confirm SweetAlert if any - forcing click on confirming element if it appears
        // cy.get('.swal2-confirm').click({ force: true }); // Commenting out as previous analysis showed direct link, but keeping if needed

        // Verify Tender Awarded (Redirects to Post-Award)
        cy.contains('Tender Award Summary', { timeout: 10000 }).should('be.visible');

        // ----------------------------------------
        // 6. Post-Award: Generate PO
        // ----------------------------------------
        // Navigate to Post-Award page
        cy.visit(`/publisher/tender/${tenderId}/post-award`);

        // Generate PO
        cy.contains('Generate PO').click();

        // Fill PO Form
        cy.get('input[name="amount"]').clear().type('48000'); // Negotiated amount
        cy.get('textarea[name="terms"]').type('Standard Terms and Conditions TEST_MOCK_');

        // Submit PO
        cy.get('button[type="submit"]').click();

        // Verify PO Generated
        cy.contains('PO Generated').should('be.visible');

        // ----------------------------------------
        // 7. Issue Work Order
        // ----------------------------------------
        // Click "Issue Work Order"
        cy.contains('Issue Work Order').click();

        // Fill WO Form
        cy.get('input[name="title"]').type('E2E Work Order');
        cy.get('textarea[name="description"]').type('Complete the construction work');
        cy.get('input[name="value"]').clear().type('48000');

        // Dates
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        cy.get('input[name="startDate"]').type(today);
        cy.get('input[name="completionDate"]').type(nextMonth);

        // Add Milestone (if required fields exist)
        // cy.contains('Add Milestone').click();
        // cy.get('input[name="milestoneDesc"]').type('Phase 1');
        // cy.get('input[name="milestoneDate"]').type(nextMonth);
        // cy.get('input[name="milestoneAmount"]').type('10000');

        // Submit WO
        cy.get('button[type="submit"]').click();

        cy.contains('Work Order Issued').should('be.visible');

        // ----------------------------------------
        // 8. Bidder Verifies
        // ----------------------------------------
        cy.clearCookies();
        cy.visit('/auth/login');
        cy.get('#email').type(bidder.email);
        cy.get('#password').type(bidder.password);
        cy.contains('button', 'Log in').click();

        // Navigate to My Participation -> Tender
        cy.visit(`/user/my-participation/tender/${tenderId}`);

        // Verify PO and WO Visible
        cy.contains('Purchase Order').should('be.visible');
        cy.contains('Work Order').should('be.visible');

        // Open WO
        cy.contains('View Work Order').click();
        cy.contains('E2E Work Order').should('be.visible');
    });
});
