const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");

// GET ALL
router.get("/", async (req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
});

// GET ONE
router.get("/:id", async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    res.json(coupon);
});

// CREATE
router.post("/", async (req, res) => {
    try {
        console.log("Incoming Data:", req.body); // 🔥 debug

        const newCoupon = new Coupon({
            code: req.body.code?.toUpperCase(),
            description: req.body.description,
            discountType: req.body.discountType,
            value: Number(req.body.value),
            minOrder: Number(req.body.minOrder) || 0,
            usageLimit: Number(req.body.usageLimit) || 0,
            startDate: req.body.startDate,
            expiryDate: req.body.expiryDate,
            status: req.body.status || "Active"
        });

        await newCoupon.save();

        res.status(201).json(newCoupon);

    } catch (error) {
        console.error("Coupon Save Error:", error);
        res.status(500).json({ message: error.message });
    }

});


// UPDATE
router.put("/:id", async (req, res) => {
    const updated = await Coupon.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );
    res.json(updated);
});

// DELETE
router.delete("/:id", async (req, res) => {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: "Coupon deleted" });
});

module.exports = router;
