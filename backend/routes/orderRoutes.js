const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const razorpay = require("../config/razorpay");
const protect = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const Coupon = require("../models/Coupon");
const orderController = require("../controllers/orderController");
const Transaction = require("../models/Transaction");
const Product = require("../models/Product");
const crypto = require("crypto");
const checkBlocked = require("../middleware/checkBlocked");

// CREATE ORDER (COD / regular)
router.post("/", protect,checkBlocked, async (req, res) => {
    try {
        const { paymentMethod, address, couponCode } = req.body;

        if (!address) {
            return res.status(400).json({ message: "Address is required" });
        }

        // 🔎 DEBUG LOG
        console.log("User placing order:", req.user.id);

        // 1️⃣ Fetch cart properly
        const cart = await Cart.findOne({ user: req.user.id })
            .populate("items.product");

        console.log("Cart found:", cart);

        if (!cart) {
            return res.status(400).json({ message: "Cart not found" });
        }

        if (!cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }
        console.log("ADDRESS RECEIVED:", address);

        // 2️⃣ Create order items
        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            image: item.product.image || "assets/images/default.png"
        }));

        // 3️⃣ Calculate subtotal
        const subtotal = orderItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        let discount = 0;

        // 4️⃣ Coupon logic

if (couponCode) {
  const coupon = await Coupon.findOne({
    code: couponCode,
    status: "Active"
  });
    

    if (!coupon) {
        return res.status(400).json({ message: "Invalid coupon" });
    }

    if (coupon) {
    if (coupon.expiryDate && coupon.expiryDate < new Date()) {
      return res.status(400).json({ message: "Coupon expired" });
    }

    if (subtotal >= coupon.minOrder) {
      if (coupon.discountType === "flat") {
        discount = coupon.value;
      } else {
        discount = (subtotal * coupon.value) / 100;
      }

      if (discount > subtotal) discount = subtotal;

      coupon.usedCount = (coupon.usedCount || 0) + 1;
      await coupon.save();
    }
  }
}
const shipping = paymentMethod?.trim().toLowerCase() === "cash on delivery" ? 50 : 0;
const totalAmount = subtotal - discount + shipping;

// check stock
for (const item of orderItems) {
    const product = await Product.findById(item.product);

    if (product.stock < item.quantity) {
        return res.status(400).json({
            message: `${product.name} has only ${product.stock} left`
        });
    }
}
// 🔥 ATOMIC STOCK UPDATE (ADD THIS)

let updatedProducts = [];

for (const item of orderItems) {

  const product = await Product.findOneAndUpdate(
    {
      _id: item.product,
      stock: { $gte: item.quantity }
    },
    {
      $inc: { stock: -item.quantity }
    },
    { new: true }
  );

  if (!product) {

    // rollback
    for (let p of updatedProducts) {
      await Product.findByIdAndUpdate(p.id, {
        $inc: { stock: p.qty }
      });
    }

    return res.status(400).json({
      message: `${item.name} is out of stock`
    });
  }

  updatedProducts.push({
    id: item.product,
    qty: item.quantity
  });
}

// create order
const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    address,
  subtotal: req.body.subtotal || subtotal,
  discount: req.body.discount || discount,
  shipping,
  totalAmount: req.body.totalAmount || totalAmount,
  couponCode,
    paymentMethod: paymentMethod || "Cash on Delivery",
    status: "Pending"
});

// reduce stock
// for (const item of orderItems) {
//     await Product.findByIdAndUpdate(
//         item.product,
//         { $inc: { stock: -item.quantity } }
//     );
// }
        if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode });

    if (coupon) {
        coupon.usedCount = (coupon.usedCount || 0) + 1;
        await coupon.save();
    }
}

        // 6️⃣ Clear cart AFTER order success
        cart.items = [];
        await cart.save();

        res.status(201).json(order);

    } catch (err) {
        console.error("Order creation error:", err);
        res.status(500).json({ message: "Server error while placing order" });
    }
});



//GET ALL ORDER FOR LOGGED IN USER
router.get("/", protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .populate("items.product"); // optional, if you want product details
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET LATEST ORDER (for summary page)
router.get("/latest", protect, async (req, res) => {
    try {
        const order = await Order.findOne({ user: req.user.id })
            .sort({ createdAt: -1 })
            .populate("items.product");
        if (!order) return res.status(404).json({ message: "No orders found" });
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// COD confirmation
router.post("/:orderId/cod", protect, async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.orderId,
            { paymentMethod: "Cash on Delivery", paymentStatus: "Pending" },
            { new: true }
        );
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        await Cart.findOneAndUpdate({ user: order.user }, { items: [] });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// ADMIN: GET ALL ORDERS
router.get("/admin/all", protect, adminMiddleware, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// UPDATE ORDER STATUS (ADMIN)
router.put("/:id/status", protect, adminMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!order) return res.status(404).json({ message: "Order not found" });
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
// GET SINGLE ORDER (for customers)
router.get("/:id", protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('items.product');

        if (!order) return res.status(404).json({ message: "Order not found" });

        // Only allow owner or admin
        if (order.user.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: "Forbidden" });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/orders/cancel/:orderId
router.put('/cancel/:orderId', protect,orderController.cancelFullOrder, async (req, res) => {
    const { orderId } = req.params;
    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        // Allow cancel if status is Pending or Placed
        if (order.status === "Cancelled") {
    return res.status(400).json({ message: "Order already cancelled" });
}

if (!["Placed", "Pending"].includes(order.status)) {
    return res.status(400).json({ message: "Cannot cancel this order" });
}

        order.status = "Cancelled";
        for (const item of order.items) {

    const product = await Product.findById(item.product);

    if (product) {
        product.stock += item.quantity;
        await product.save();
    }

}
        await order.save();

        // Optional: handle Razorpay refunds here if payment was made

        res.json({ message: "Order cancelled successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
router.put("/cancel-item", protect, orderController.cancelSingleItem);
router.post("/check-stock-before-payment", protect, async (req, res) => {
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

  } catch (error) {
    console.error("STOCK CHECK ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while checking stock"
    });
  }
});
router.post("/create-razorpay-order", protect, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }

    const options = {
      amount: amount, // convert to paisa
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });

  } catch (error) {
    console.error("RAZORPAY ERROR:", error);
    res.status(500).json({ message: "Failed to create Razorpay order" });
  }
});
router.post("/verify-razorpay-payment", protect, async (req, res) => {
  try {

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      address,
      couponCode
    } = req.body;

    // verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed"
      });
    }

    // get cart
    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    // order items
    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.image
    }));

    // subtotal
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    let discount = 0;

    // coupon logic
    if (couponCode) {

      const coupon = await Coupon.findOne({
        code: couponCode,
        status: "Active"
      });

      if (coupon) {

        if (coupon.expiryDate && coupon.expiryDate < new Date()) {
          return res.status(400).json({ message: "Coupon expired" });
        }

        if (subtotal >= coupon.minOrder) {

          if (coupon.discountType === "flat") {
            discount = coupon.value;
          } else {
            discount = (subtotal * coupon.value) / 100;
          }

          if (discount > subtotal) discount = subtotal;

          coupon.usedCount = (coupon.usedCount || 0) + 1;
          await coupon.save();
        }
      }
    }

    const totalAmount = subtotal - discount;
// 🔥 ADD THIS BEFORE ORDER CREATION (DO NOT REMOVE EXISTING CODE)

let updatedProducts = [];

for (const item of orderItems) {

  const product = await Product.findOneAndUpdate(
    {
      _id: item.product,
      stock: { $gte: item.quantity }
    },
    {
      $inc: { stock: -item.quantity }
    },
    { new: true }
  );

  if (!product) {

    // 🔥 rollback already updated products
    for (let p of updatedProducts) {
      await Product.findByIdAndUpdate(p.id, {
        $inc: { stock: p.qty }
      });
    }

    return res.status(400).json({
      success: false,
      message: `${item.name} is out of stock`
    });
  }

  updatedProducts.push({
    id: item.product,
    qty: item.quantity
  });
}
    // create order
    const order = await Order.create({
  user: req.user.id,
  items: orderItems,
  address,
  subtotal: req.body.subtotal || subtotal,
  discount: req.body.discount || discount,
  totalAmount: req.body.totalAmount || totalAmount,
  couponCode,
  paymentMethod: "Razorpay",
  paymentId: razorpay_payment_id,
  razorpayOrderId: razorpay_order_id,
  status: "Placed",
  paymentStatus: "Paid"
});

// ⭐ CREATE TRANSACTION
await Transaction.create({
  user: req.user.id,
  transactionId: `TXN${Date.now()}`,
  orderId: order._id,
  paymentMethod: "Razorpay",
  amount: order.totalAmount,
  type: "debit",
  status: "Success"
});

    // reduce stock
    // for (const item of orderItems) {
    //   await Product.findByIdAndUpdate(
    //     item.product,
    //     { $inc: { stock: -item.quantity } }
    //   );
    // }

    // clear cart
    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      orderId: order._id
    });

  } catch (error) {

    console.error("VERIFY PAYMENT ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Payment verification failed"
    });

  }
});
module.exports = router;
