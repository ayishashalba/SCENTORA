const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

router.get("/", async (req, res) => {
  try {
    const { filter, fromDate, toDate } = req.query;

let dateQuery = {};

// ✅ CUSTOM DATE
if (filter === "custom" && fromDate && toDate) {
  const start = new Date(fromDate + "T00:00:00.000Z");
  const end = new Date(toDate + "T23:59:59.999Z");

  dateQuery = {
    $gte: start,
    $lte: end
  };

} else {
  // ✅ DEFAULT (days filter)
  const days = parseInt(req.query.days) || 30;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  dateQuery = { $gte: startDate };
}

// ✅ USE HERE
const orders = await Order.find({
  createdAt: dateQuery,
  status: { $in: ["Placed", "Packed", "Shipped", "Delivered"] }
}).populate("items.product");

    let totalRevenue = 0;
    const totalOrders = orders.length;

    const monthlyRevenue = new Array(12).fill(0);
    const monthlyOrders = new Array(12).fill(0);
    const productSales = {};

    orders.forEach(order => {
      totalRevenue += order.totalAmount || 0;
      const month = new Date(order.createdAt).getMonth();
      monthlyRevenue[month] += order.totalAmount || 0;
      monthlyOrders[month] += 1;

      order.items.forEach(item => {
        if (!item.product) return;

        const pid = item.product._id.toString();
        if (!productSales[pid]) {
          productSales[pid] = {
            name: item.product.name,
            totalSold: 0,
            price: item.product.price,
            revenue: 0,
            stock: item.product.stock,
            status: item.product.stock > 0 ? "In Stock" : "Out of Stock",
            image: item.product.image || "placeholder.png"
          };
        }
        productSales[pid].totalSold += item.quantity;
         productSales[pid].revenue += item.quantity * item.product.price;
      });
    });

    const bestSelling = Object.values(productSales)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    const totalSubscribers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();

    res.json({
      totalRevenue,
      totalOrders,
      monthlyRevenue,
      monthlyOrders,
      bestSelling,
      totalSubscribers,
      totalProducts
    });

  } catch (err) {
    console.error("Reports Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;