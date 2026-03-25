const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ADMIN LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // ✅ If token already exists
        if (admin.activeToken) {
            try {
                // Check if token still valid
                jwt.verify(admin.activeToken, process.env.JWT_SECRET);

                // 🔥 If valid → return SAME token
                return res.json({
                    token: admin.activeToken,
                    name: admin.name
                });

            } catch (err) {
                // Token expired → generate new one
            }
        }

        // 🔥 Generate new token if none exists or expired
        const token = jwt.sign(
            { id: admin._id, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        admin.activeToken = token;
        await admin.save();

        res.json({
            token,
            name: admin.name
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ message: err.message });
    }

});


module.exports = router;
