const express = require("express");
const router = express.Router();

const Wallet = require("../models/Wallet");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Transaction = require("../models/Transaction");

const protect = require("../middleware/authMiddleware");

// GET wallet info
router.get("/", protect, async (req, res) => {
    try {
        let wallet = await Wallet.findOne({ user: req.user.id });
        if (!wallet) {
            const defaultBalance = 500;
            wallet = await Wallet.create({
                user: req.user.id,
                balance: defaultBalance,
                transactions: [
                    {
                        type: "credit",
                        amount: defaultBalance,
                        description: "Welcome Bonus",
                        status: "Completed",
                        date: new Date()
                    }
                ]
            });
        }
        res.json(wallet);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
// Add money
router.post("/add", protect, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

        const wallet = await Wallet.findOne({ user: req.user.id });
        if (!wallet) return res.status(404).json({ message: "Wallet not found" });

        // Add amount
        wallet.balance += amount;

        // Add transaction record
        wallet.transactions.push({
            type: "credit",
            amount,
            description: "Wallet Top-up",
            status: "Completed",
            date: new Date()
        });

        await wallet.save();
        res.json(wallet);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
router.post("/pay", protect, async (req, res) => {
  try {

    const { amount, couponCode, discount, address} = req.body;

    const wallet = await Wallet.findOne({ user: req.user.id });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found"
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance"
      });
    }

    // get cart first
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.image
    }));

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const totalAmount = subtotal - (discount || 0);
for (const item of orderItems) {
  const product = await Product.findById(item.product);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found"
    });
  }

  if (product.stock < item.quantity) {
    return res.status(400).json({
      success: false,
      message: `${product.name} is out of stock`
    });
  }
}
    // ✅ Create order FIRST
    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      address,
      subtotal,
      discount,
      totalAmount,
      couponCode,
      paymentMethod: "Wallet",
      paymentStatus: "Paid",
      status: "Placed"
    });

    // ✅ Deduct wallet AFTER order creation
    wallet.balance -= amount;
    // Add wallet history record
wallet.transactions.push({
  type: "debit",
  amount: amount,
  description: "Wallet payment for order",
  status: "Completed",
  date: new Date()
});
    await wallet.save();
    const transactionId = "TXN" + Date.now();

    // transaction log
    await Transaction.create({
         user: req.user.id,
  transactionId: transactionId,
  orderId: order._id,
  paymentMethod: "Wallet",
  amount: amount,
  type: "debit",
  status: "Success",
  date: new Date()
});

    // reduce stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
    }

    // clear cart
    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      orderId: order._id
    });

  } catch (error) {

    console.error("WALLET PAYMENT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Wallet payment failed"
    });

  }
});
router.put('/cancel/:orderId', protect, async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (!["Placed", "Pending"].includes(order.status)) 
            return res.status(400).json({ message: "Cannot cancel this order" });

        order.status = "Cancelled";
        await order.save();

        // Refund to wallet if paid via Wallet OR Razorpay
        if (["Wallet", "Razorpay"].includes(order.paymentMethod)) {
            const wallet = await Wallet.findOne({ user: order.user });
            if (wallet) {
                wallet.balance += order.totalAmount;
                wallet.transactions.push({
                    type: "credit",
                    amount: order.totalAmount,
                    description: `Refund for cancelled order ${order._id} (${order.paymentMethod})`,
                    status: "Completed",
                    date: new Date()
                });
                await wallet.save();
            }
        }

        res.json({ message: "Order cancelled successfully and amount refunded to wallet" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
