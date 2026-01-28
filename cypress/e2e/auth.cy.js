describe('Authentication Flows', () => {
    beforeEach(() => {
        // Clear cookies and local storage to ensure a clean state
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    it('should allow a new user to sign up', () => {
        const timestamp = Date.now();
        const newUser = {
            name: `User ${timestamp}`,
            email: `newuser_${timestamp}@example.com`,
            password: 'Password@123',
            phone: '9876543210'
        };

        cy.visit('/auth/signup');
        cy.get('input[name="name"]').type(newUser.name);
        cy.get('input[name="email"]').type(newUser.email);
        cy.get('input[name="phone"]').type(newUser.phone);
        cy.get('input[name="password"]').type(newUser.password);
        cy.get('input[name="confirmPassword"]').type(newUser.password);

        // Submit form
        cy.contains('button', 'Sign Up').click();

        // Verification - should redirect to verify-otp
        cy.url().should('include', '/auth/verify-otp');
    });

    it('should allow an existing user to login', () => {
        const timestamp = Date.now();
        const userEmail = `user_login_${timestamp}@example.com`;
        const userPassword = 'Password@123';

        // Seed the user first
        cy.task('seedUser', {
            name: 'Login User',
            email: userEmail,
            password: userPassword,
            role: 'user',
            isVendor: false
        });

        cy.visit('/auth/login');
        cy.get('#email').type(userEmail); // Using ID selector based on previous context
        cy.get('#password').type(userPassword);
        cy.contains('button', 'Login').click();

        cy.url().should('include', '/auth/dashboard');
        cy.contains('Dashboard').should('exist');
    });

    it('should allow admin to login', () => {
        const timestamp = Date.now();
        const adminEmail = `admin_${timestamp}@nexabid.com`;
        const adminPassword = 'Admin@123';

        // Seed admin
        cy.task('seedAdmin', {
            email: adminEmail,
            password: adminPassword
        });

        cy.visit('/admin/login');
        cy.get('#email').type(adminEmail);
        cy.get('#password').type(adminPassword);
        cy.contains('button', 'Login').click();

        cy.url().should('include', '/admin/dashboard');
        cy.contains('Admin Dashboard').should('exist');
    });
});
