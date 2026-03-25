const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin'); // your admin model

const adminProtect = async (req, res, next) => {
    let token;

    // Check for token in headers
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach admin to request
            req.admin = await Admin.findById(decoded.id).select('-password');

            if (!req.admin) {
                return res.status(401).json({ success: false, message: 'Not authorized' });
            }

            next();
        } catch (err) {
            console.error(err);
            return res.status(401).json({ success: false, message: 'Token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }
};

module.exports = adminProtect;
