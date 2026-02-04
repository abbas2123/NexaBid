describe('Vendor Onboarding & Verification', () => {
    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    it('should allow admin to approve a submitted vendor application', () => {
        const timestamp = Date.now();
        const vendorEmail = `vendor_verify_${timestamp}@example.com`;
        const vendorPassword = 'Password@123';
        const adminEmail = `admin_v_${timestamp}@nexabid.com`;

        // 1. Seed User (Potential Vendor)
        cy.task('seedUser', {
            name: 'Vendor Candidate',
            email: vendorEmail,
            password: vendorPassword,
            role: 'vendor', // They start as vendor role but unverified usually? Or user role? 
            // Based on code, they probably apply as user or unverified vendor. 
            // We'll set isVendor: false to simulate they need approval? 
            // Actually, seedUser defaults isVendor: true if not passed, but we updated it.
            // Let's pass isVendor: false to mimic "Just signed up and applied"
            isVendor: false
        });

        // 2. Seed Vendor Application (Submitted status)
        cy.task('seedVendorApplication', {
            email: vendorEmail,
            businessName: `Biz ${timestamp}`
        });

        // 3. Seed Admin
        cy.task('seedAdmin', {
            email: adminEmail,
            password: 'Admin@123'
        });

        // 4. Login as Admin
        cy.visit('/admin/login');
        cy.get('#email').type(adminEmail);
        cy.get('#password').type('Admin@123');
        cy.contains('button', 'Login').click();

        // 5. Navigate to Vendor Management
        // Assuming there is a link or we can visit directly
        cy.url().should('include', '/admin/dashboard');

        // Look for the task in the dashboard or go to vendor list
        // Dashboard has "Pending Tasks" table from our previous debug
        // We hopefully see our vendor there
        cy.contains(`Biz ${timestamp}`).should('exist');

        // Click action button logic
        // The dashboard had "Open" or similar links. 
        // Or we can visit /admin/vendor-management
        cy.visit('/admin/vendor-management');

        // 6. Approve Vendor
        // Find the row with our vendor
        cy.contains(`Biz ${timestamp}`)
            .closest('tr')
            .within(() => {
                cy.contains('View').click(); // Adjust selector based on actual UI
            });

        // On waiting detail page or modal
        // This part relies on knowing the UI. 
        // I'll assume standard specific buttons exist.
        // If this fails, I'll need to inspect `views/admin/vendorList.ejs` or similar.
        cy.contains('Approve').click();

        // 7. Verify Success
        cy.contains('Vendor approved successfully').should('be.visible');
    });
});
