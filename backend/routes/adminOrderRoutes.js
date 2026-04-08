const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Order = require("../models/Order");
const adminProtect = require("../middleware/adminProtect");
const { updateOrderStatus } = require("../controllers/adminOrderController");


// GET ALL ORDERS FOR ADMIN
router.get("/", adminProtect, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "name email phone")
            .sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        console.error("Admin Orders Fetch Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// GET SINGLE ORDER FOR ADMIN
router.get("/:id", adminProtect, async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Order ID" });
    }

    try {
        const order = await Order.findById(id)
            .populate("user", "name email phone")
            .lean(); 
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (!order.user) {
            order.user = { name: "Unknown", email: "-", phone: "-" };
        }

        res.status(200).json(order);
    } catch (error) {
        console.error("Admin Single Order Fetch Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

// UPDATE ORDER STATUS
router.put("/:id/status", adminProtect, updateOrderStatus, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid Order ID" });
    }

    try {
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        order.status = status || order.status;
        await order.save();

        res.status(200).json(order);
    } catch (error) {
        console.error("Admin Update Order Status Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;