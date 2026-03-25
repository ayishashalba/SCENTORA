const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware"); // JWT middleware
const User = require("../models/User");

// Default settings for new users
const defaultSettings = {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    accountPrivacy: true,
    appearance: "Light Mode",
    fontSize: "Medium",
    language: "English (US)",
    twoFactorAuth: false
};

// GET user profile (for settings page)
router.get("/profile", protect, (req, res) => {
    const { fullName, email, avatar } = req.user;
    const settings = req.user.settings && Object.keys(req.user.settings).length
        ? req.user.settings
        : defaultSettings;

    res.json({ fullName, email, avatar, settings });
});

// GET /api/settings - fetch user settings
router.get("/", protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("fullName settings");
        if (!user) return res.status(404).json({ error: "User not found" });

        const settings = user.settings && Object.keys(user.settings).length
            ? user.settings
            : defaultSettings;

        res.json({ fullName: user.fullName, settings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /api/settings - update a specific setting
router.post("/", protect, async (req, res) => {
    const { setting, value } = req.body;

    if (!setting) return res.status(400).json({ error: "Setting name required" });

    // initialize settings if missing
    if (!req.user.settings) req.user.settings = { ...defaultSettings };

    // Update setting
    req.user.settings[setting] = value;

    try {
        await req.user.save();
        res.json({ success: true, settings: req.user.settings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
