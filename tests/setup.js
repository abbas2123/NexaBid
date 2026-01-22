const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

let mongo;

beforeAll(async () => {
    // Use a fresh in-memory database with Replica Set support for transactions
    mongo = await MongoMemoryReplSet.create({ replSet: { name: "testset", count: 1 } });
    const uri = mongo.getUri();
    console.log(`Test DB URI: ${uri}`);

    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    await mongoose.connect(uri);
});

afterEach(async () => {
    if (global.skipAfterEach) return;
    // Clean up collections after each test to ensure isolation
    if (mongoose.connection.readyState !== 0) {
        const collections = await mongoose.connection.db.collections();
        for (let collection of collections) {
            await collection.deleteMany({});
        }
    }
});

afterAll(async () => {
    // Graceful shutdown
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongo) {
        await mongo.stop();
    }
});
