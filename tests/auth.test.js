const request = require("supertest");
const startApp = require("../app");

describe("Authentication & RBAC Tests", () => {
    let app;

    beforeAll(async () => {
        app = await startApp();
    });

    describe("API: /auth/signup", () => {
        it("should register a new user successfully", async () => {
            const res = await request(app)
                .post("/auth/signup")
                .send({
                    name: "Test User",
                    email: "tester@nexabid.com",
                    phone: "9876543210",
                    password: "Password@123"
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });
    });

    describe("Security: RBAC", () => {
        it("should deny access to admin dashboard for unauthenticated users", async () => {
            const res = await request(app).get("/admin/dashboard");
            // Should redirect to login or return 401/403
            expect([302, 401, 403]).toContain(res.status);
        });
    });
});
