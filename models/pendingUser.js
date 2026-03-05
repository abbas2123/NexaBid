const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        passwordHash: { type: String, required: true },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 600, // 10 minutes
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('PendingUser', pendingUserSchema);
