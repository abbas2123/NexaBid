const mongoose = require('mongoose');
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
require("dotenv").config({ path: envFile });

const clearDatabase = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }

        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to database.');

        console.log('Clearing all collections...');
        const collections = await mongoose.connection.db.collections();

        for (const collection of collections) {
            const name = collection.collectionName;
            if (name === 'system.views') continue;

            console.log(`Clearing collection: ${name}`);
            await collection.deleteMany({});
        }

        console.log('All collections cleared successfully.');

        await mongoose.connection.close();
        console.log('Connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error clearing database:', err);
        process.exit(1);
    }
};

clearDatabase();
