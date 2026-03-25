const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Coupon = require("../models/Coupon");
const User = require("../models/User");

// GET all active coupons for users
router.get("/", authMiddleware, async (req, res) => {
    try {
        const now = new Date();

        const availableCoupons = await Coupon.find({
            isActive: true,
            expiryDate: { $gte: now }
        });

        const appliedCoupons = await Coupon.find({
            code: { $in: req.user.appliedCoupons || [] }
        });

        res.json({
            available: availableCoupons,
            applied: appliedCoupons
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load coupons" });
    }
});

// APPLY coupon
router.post("/apply", authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        const user = req.user;

        const coupon = await Coupon.findOne({ code, status: "Active" });
        if (!coupon) return res.status(404).json({ message: "Coupon not found" });

        if (!user.appliedCoupons) user.appliedCoupons = [];
        if (user.appliedCoupons.includes(code))
            return res.status(400).json({ message: "Coupon already applied" });

        // Optional: Check min order, usage limit etc.
        user.appliedCoupons.push(code);
        await user.save();

        res.json({ message: `Coupon ${code} applied!` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to apply coupon" });
    }
});

// REMOVE coupon
router.post("/remove", authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        const user = req.user;

        if (!user.appliedCoupons || !user.appliedCoupons.includes(code))
            return res.status(400).json({ message: "Coupon not applied" });

        user.appliedCoupons = user.appliedCoupons.filter(c => c !== code);
        await user.save();

        res.json({ message: `Coupon ${code} removed!` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to remove coupon" });
    }
});

module.exports = router;
