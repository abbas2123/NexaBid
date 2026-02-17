const mongoose = require('mongoose');

const jobLockSchema = new mongoose.Schema({
    jobName: {
        type: String,
        required: true,
        unique: true,
    },
    lockedAt: {
        type: Date,
        default: Date.now,
    },
    expireAt: {
        type: Date,
        required: true,
        index: { expires: 0 }, // TTL index: auto-delete document when time exceeds expireAt
    },
});

module.exports = mongoose.model('JobLock', jobLockSchema);
