
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Razorpay = require("razorpay");
const authMiddleware = require("../middleware/authMiddleware");
const crypto = require("crypto");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// CREATE RAZORPAY ORDER

router.post("/create-order/:orderId", authMiddleware, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        const options = {
            amount: order.totalAmount * 100, // amount in paise
            currency: "INR",
            receipt: `receipt_${order._id}`,
        };

        const rOrder = await razorpay.orders.create(options);

        res.status(200).json({
            id: rOrder.id,
            amount: rOrder.amount,
            currency: rOrder.currency,
            orderId: order._id,
        });
    } catch (err) {
        console.error("Error creating Razorpay order:", err);
        res.status(500).json({ message: "Failed to create Razorpay order" });
    }
});


// CASH ON DELIVERY (COD) ORDER

router.post("/cod-order", authMiddleware, async (req, res) => {
    try {
        const { products, amount } = req.body;

        if (!products || products.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        const newOrder = new Order({
    user: req.user._id,
    items: products,
    totalAmount: amount,
    paymentMethod: "COD",
    status: "Pending",

    paymentInfo: {
        method: "COD",
        status: "Pending"
    }
});

        await newOrder.save();
        res.status(200).json({ success: true, orderId: newOrder._id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to place COD order" });
    }
});

router.post("/check-stock-before-payment", authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    for (const item of cart.items) {
      if (!item.product) {
        return res.status(400).json({
          success: false,
          message: "A product in cart no longer exists"
        });
      }

      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${item.product.name} is out of stock`
        });
      }
    }

    return res.json({
      success: true,
      message: "Stock available"
    });

  } catch (err) {
    console.error("Stock pre-check error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while checking stock"
    });
  }
});

// VERIFY RAZORPAY PAYMENT

router.post("/verify-razorpay-payment", authMiddleware, async (req, res) => {

    const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        subtotal,
        discount,
        totalAmount,
        couponCode
    } = req.body;

    const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

    if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false });
    }

    // get cart
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: "Cart empty" });
    }

    const orderItems = cart.items.map(item => ({
        product: item.product._id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        image: item.product.image
    }));

    for (const item of orderItems) {
  const updatedProduct = await Product.findOneAndUpdate(
    {
      _id: item.product,
      stock: { $gte: item.quantity }
    },
    {
      $inc: { stock: -item.quantity }
    },
    { new: true }
  );

  if (!updatedProduct) {
    return res.status(400).json({
      success: false,
      message: `${item.name} is out of stock`
    });
  }
}

const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    subtotal,
    discount,
    totalAmount,
    couponCode,
    paymentMethod: "Razorpay",
    paymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    status: "Placed",

    paymentInfo: {
        method: "Razorpay",
        status: "Completed"
    }
});

    // clear cart
    cart.items = [];
    await cart.save();

    res.json({
        success: true,
        orderId: order._id
    });

});
router.post("/pay", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { products, totalAmount } = req.body;

        if (!products || products.length === 0 || !totalAmount) {
            return res.status(400).json({ success: false, message: "Invalid order data" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(400).json({ success: false, message: "User not found" });

        if (user.wallet < totalAmount) {
            return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
        }

        // Deduct wallet
        user.wallet -= totalAmount;
        await user.save();

        // Create order
        const newOrder = new Order({
    user: userId,
    items: products,
    totalAmount,
    paymentMethod: "Wallet",
    status: "Placed",

    paymentInfo: {
        method: "Wallet",
        status: "Completed"
    }
});

        const savedOrder = await newOrder.save();

        // Create transaction
        const newTransaction = new Transaction({
            transactionId: `TXN${Date.now()}`,
            orderId: savedOrder._id,
            paymentMethod: "Wallet",
            amount: totalAmount,
            type: "debit",
            status: "Success",
            date: new Date()
        });

        await newTransaction.save();

        res.json({ success: true, order: savedOrder, transaction: newTransaction });

    } catch (err) {
        console.error("Wallet payment error:", err);
        res.status(500).json({ success: false, message: "Server error while processing wallet payment" });
    }
});

module.exports = router;
