const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1]; // Bearer token
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        // ❌ Hard block check
            
        req.user = user; // attach full user object
        next();
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: "Invalid token." });
    }
};

module.exports = protect;
