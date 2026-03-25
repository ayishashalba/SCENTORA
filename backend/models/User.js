const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    gender:{type:String},
    dob:{type:Date},
    password: {
  type: String,
  required: false,
  default: null
},
googleId: {
  type: String,
  default: null
},
    isAdmin: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },

    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiry: { type: Date },
    resetOtp: { type: String },
    resetOtpExpiry: { type: Date },

    appliedCoupons: [{ type: String }], // array of coupon codes

    // ⚡ Add settings object
    // Inside your existing User schema
settings: {
    // Notifications
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true },
    accountPrivacy: { type: Boolean, default: true },

    // Display Preferences
    appearance: { type: String, enum: ["Light Mode", "Dark Mode", "System Default"], default: "Light Mode" },
    fontSize: { type: String, enum: ["Small", "Medium", "Large"], default: "Medium" },
    language: { type: String, default: "English (US)" },

    // Security
    twoFactorAuth: { type: Boolean, default: false }
}


}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
