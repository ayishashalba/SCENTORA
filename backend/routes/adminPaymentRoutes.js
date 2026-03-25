const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");

// GET ALL PAYMENTS
router.get("/", async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate("user", "name email")
            .populate("order", "orderNumber")
            .sort({ createdAt: -1 });

        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// REFUND PAYMENT
router.put("/refund/:id", async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment)
            return res.status(404).json({ message: "Payment not found" });

        payment.status = "Refunded";
        await payment.save();

        res.json({ message: "Refund processed" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
