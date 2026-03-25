const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const adminProtect = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const admin = await Admin.findById(decoded.id);

        if (!admin || admin.activeToken !== token) {
            return res.status(401).json({ message: "Not authorized" });
        }

        req.admin = admin;
        next();

    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = adminProtect;
