const express = require("express");
const router = express.Router();
const Settings = require("../models/Settings"); // create this model

// Get settings
router.get("/settings", async (req, res) => {
    try {
        const settings = await Settings.findOne(); // fetch the single settings document
        if (!settings) return res.status(404).json({ message: "Settings not found" });
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Update general settings
router.put("/settings/general", async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings) return res.status(404).json({ message: "Settings not found" });

        settings.siteName = req.body.siteName;
        settings.adminEmail = req.body.adminEmail;
        settings.contactNumber = req.body.contactNumber;

        await settings.save();
        res.json({ message: "General settings updated" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/admin/settings
router.get("/settings", async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings) return res.status(404).json({ message: "Settings not found" });
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
module.exports = router;
