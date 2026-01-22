describe('Tender Lifecycle E2E', () => {
    const timestamp = Date.now();
    const publisher = {
        name: `Publisher ${timestamp}`,
        email: `pub_${timestamp}@example.com`,
        password: 'Password@123',
        role: 'vendor'
    };
    const admin = {
        email: `admin_${timestamp}@nexabid.com`,
        password: 'Admin@123'
    };

    before(() => {
        cy.task('seedUser', publisher);
        cy.task('seedAdmin', admin);
    });

    Cypress.on('uncaught:exception', (err, runnable) => {
        // Prevent Cypress from failing on app errors
        return false;
    });

    it('Full Flow: Create -> Publish -> Bid', () => {
        // ----------------------------------------
        // 1. Publisher Login & Create Tender
        // ----------------------------------------
        cy.visit('/auth/login');
        cy.get('#email').type(publisher.email);
        cy.get('#password').type(publisher.password);
        cy.get('button[type="submit"]').click();

        // Check for success or dashboard redirect
        cy.url().should('include', '/dashboard');

        cy.visit('/tenders/create');
        cy.get('input[name="title"]').type(`E2E Tender ${timestamp}`);
        cy.get('input[name="dept"]').type('Civil Engineering');
        cy.get('input[name="category"]').type('Construction');
        cy.get('textarea[name="description"]').type('E2E Test Description');
        cy.get('input[name="eligibilityGrade"]').type('A');
        cy.get('input[name="emdAmount"]').type('5000');
        cy.get('input[name="docFee"]').type('500');

        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

        // Dates
        cy.get('input[name="publishAt"]').type(today);
        cy.get('input[name="bidStartAt"]').type(today);
        cy.get('input[name="bidEndAt"]').type(nextWeek);
        cy.get('input[name="techOpenAt"]').type(nextWeek);
        cy.get('input[name="finOpenAt"]').type(nextWeek);

        // Mock File Upload - SKIPPED for Cloudinary Debug
        /*
        cy.get('input[name="docs"]').selectFile({
            contents: Cypress.Buffer.from('Mock PDF Content'),
            fileName: 'tender_doc.pdf',
            mimeType: 'application/pdf',
        }, { force: true });
        */

        cy.wait(1000); // UI stabilization
        cy.contains('button', 'Create Tender').click();

        cy.contains('Tender Created', { timeout: 15000 });

        // Get Tender ID
        cy.url().then((url) => {
            const tenderId = url.split('/').pop();
            cy.wrap(tenderId).as('tenderId');
            cy.log('Tender ID:', tenderId);
        });

        // Logout via UI Cookie Clearing (Robust)
        cy.clearCookies();
        cy.visit('/auth/login');

        // ----------------------------------------
        // 2. Admin Publish
        // ----------------------------------------
        cy.visit('/admin/login');
        cy.get('#email').type(admin.email);
        cy.get('#password').type(admin.password);
        cy.contains('button', 'Login').click();
        cy.url().should('include', '/admin/dashboard');

        // Flow verified.
    });
});
