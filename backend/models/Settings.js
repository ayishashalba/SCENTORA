const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
    siteName: { type: String, required: true },
    adminEmail: { type: String, required: true },
    contactNumber: { type: String },
    siteLogo: { type: String },
    twoFactorAuth: { type: Boolean, default: false },
    theme: { type: String, default: "Light Mode (Classic)" },
    layout: { type: String, default: "Spacious" },
    language: { type: String, default: "English (US)" },
    notifications: {
        orderAlerts: { type: Boolean, default: true },
        paymentAlerts: { type: Boolean, default: false },
        userGrowth: { type: Boolean, default: true },
        lowStock: { type: Boolean, default: true }
    }
});

module.exports = mongoose.model("Settings", settingsSchema);
