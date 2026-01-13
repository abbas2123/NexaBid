const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = async (req, res, next) => {
    try {
        const token = req.cookies.adminToken;
        if (!token) return next();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role === 'admin') {
            req.admin = await User.findById(decoded.id).lean();
        }
    } catch (err) {
        req.admin = null;
    }
    next();
};
