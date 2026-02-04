describe('Property Lifecycle & Admin Approval', () => {
    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    it('should allow admin to approve a submitted property', () => {
        const timestamp = Date.now();
        const sellerEmail = `seller_${timestamp}@example.com`;
        const adminEmail = `admin_p_${timestamp}@nexabid.com`;

        // 1. Seed Seller
        cy.task('seedUser', {
            name: 'Seller User',
            email: sellerEmail,
            role: 'vendor',
            isVendor: true,
            password: 'Password@123'
        });

        // 2. Seed Property (Submitted but not Approved)
        cy.task('seedProperty', {
            sellerEmail: sellerEmail,
            title: `Prop ${timestamp}`,
            status: 'draft', // Usually drafts aren't visible to admin? Or submitted?
            // Model says verificationStatus: 'submitted' is the key
            verificationStatus: 'submitted',
            status: 'draft' // or published? Let's assume it waits in draft/pending until approved
        });

        // 3. Seed Admin
        cy.task('seedAdmin', { email: adminEmail, password: 'Admin@123' });

        // 4. Login Admin
        cy.visit('/admin/login');
        cy.get('#email').type(adminEmail);
        cy.get('#password').type('Admin@123');
        cy.contains('button', 'Login').click();

        // Wait for login to complete
        cy.url().should('include', '/admin/dashboard');

        // 5. Navigate to Property Management
        cy.visit('/admin/property-management');
        cy.contains(`Prop ${timestamp}`).should('exist');

        // 6. Approve Property
        // Logic depends on the UI property management table
        cy.contains(`Prop ${timestamp}`)
            .closest('tr')
            .within(() => {
                cy.contains('Review').click();
            });

        // In Review Modal
        cy.get('#reviewModal').should('be.visible');
        cy.get('#approveBtn').click();

        // Confirm Action in SweetAlert
        cy.contains('button', 'Yes, Approve!').click();

        // 7. Verify
        cy.contains('Property has been approved').should('be.visible');
    });
});
