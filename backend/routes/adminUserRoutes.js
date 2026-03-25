const express = require("express");
const router = express.Router();
const User = require("../models/User"); // your User model
const protect = require("../middleware/authMiddleware"); // JWT auth
const adminMiddleware = require("../middleware/adminMiddleware");

// GET ALL USERS (No auth, simple fetch)
router.get("/users", async (req, res) => {
    try {
        const users = await User.find().select("-password"); // exclude password
        res.json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ message: "Server error" });
    }
});
// GET SINGLE USER (ADMIN VIEW)
router.get("/users/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);

    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({ message: "Server error" });
    }
});
// BLOCK a user
router.put("/users/:id/block", async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isBlocked: true },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User blocked", user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// UNBLOCK a user
router.put("/users/:id/unblock", async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isBlocked: false },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User unblocked", user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
