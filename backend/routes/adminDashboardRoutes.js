const express = require("express");
const router = express.Router();
const adminProtect = require("../middleware/adminMiddleware");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

router.get("/stats", adminProtect, async (req, res) => {
    try {
const filter = req.query.filter || "week";
        const { fromDate, toDate } = req.query;

let query = {};

if (filter === "custom" && fromDate && toDate) {
    const start = new Date(fromDate + "T00:00:00.000Z");
const end = new Date(toDate + "T23:59:59.999Z");
    query.createdAt = {
        $gte: start,
        $lte: end
    };
}else{
            
        let startDate = new Date();

        if (filter === "today") {
            startDate.setHours(0,0,0,0);
        }

        if (filter === "week") {
            startDate.setDate(startDate.getDate() - 6);
            startDate.setHours(0,0,0,0);
        }

        if (filter === "month") {
            startDate.setDate(startDate.getDate() - 29);
            startDate.setHours(0,0,0,0);
        }
        query.createdAt = { $gte: startDate };
        }

        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();

        const revenueData = await Order.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
        ]);

        const totalRevenue = revenueData[0]?.totalRevenue || 0;

        // 🔥 LOW STOCK PRODUCTS
        const lowStockProducts = await Product.find({ stock: { $lt: 5 } })
            .limit(3)
            .select("name price image stock");

        // 🔥 RECENT ORDERS
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("user", "email");

        // ⭐ ORDERS FOR CHART
        const ordersForChart = await Order.find(query)
    .select("createdAt totalAmount");

        res.json({
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue,
            lowStockProducts,
            recentOrders,
            ordersForChart // ⭐ important for chart
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;