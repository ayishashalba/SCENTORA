const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Wallet = require("../models/Wallet");
const Product = require("../models/Product");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Coupon = require("../models/Coupon");

exports.createOrder = async (req, res) => {
    try {

        const { address, paymentMethod, couponCode } = req.body;
        const method = (paymentMethod || "").trim().toLowerCase();

        const cart = await Cart.findOne({ user: req.user.id })
            .populate("items.product");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
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

        let discount = 0;

        if (couponCode) {

            const coupon = await Coupon.findOne({
                code: couponCode,
                status: "Active"
            });

            if (coupon) {
                if (coupon.discountType === "flat") {
                    discount = coupon.value;
                } else {
                    discount = (subtotal * coupon.value) / 100;
                }

                if (discount > subtotal) discount = subtotal;
            }
        }

        // Calculate shipping
let shipping =0;
if (paymentMethod?.trim().toLowerCase() === "cash on delivery") {
    shipping = 50;
}

// Calculate total including shipping
const totalAmount = subtotal - discount + shipping;

// for (const item of orderItems) {
//     const product = await Product.findById(item.product);

//     if (!product || product.stock < item.quantity) {
//         return res.status(400).json({
//             message: `${item.name} is out of stock`
//         });
//     }
// }
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

    // rollback already updated stock
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
if (method === "wallet") {
    const user = await User.findById(req.user.id);

    if (!user || user.walletBalance < totalAmount) {
        return res.status(400).json({
            message: "Insufficient wallet balance"
        });
    }

    user.walletBalance -= totalAmount;
    await user.save();
}
// After creating the order
const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    address,
    subtotal,
    discount,
    couponCode: couponCode || null, // ✅ ADD THIS
    shipping,
    totalAmount,
    paymentMethod: method,
    status: "Placed"
});

// CREATE TRANSACTION using request body value
await Transaction.create({
user: req.user.id,
    transactionId: "TXN-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    orderId: "ORD-" + order._id.toString().slice(-5).toUpperCase(),
    paymentMethod: method, // important fix
    amount: totalAmount,
    status: "Pending",
    type: "debit",
    date: new Date()
});
        cart.items = [];
        await cart.save();

        res.json(order);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.cancelFullOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate("user");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Order already cancelled" });
    }

    // 1️⃣ Mark all items cancelled
    order.items.forEach(item => item.status = "Cancelled");
    order.status = "Cancelled";

    // 2️⃣ Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    // 3️⃣ Refund to wallet if not COD
    if (order.paymentMethod !== "Cash on Delivery" && order.paymentInfo?.status !== "Refunded") {

      // Fetch the latest user doc
      const user = await User.findById(order.user._id);

      user.walletBalance = (user.walletBalance || 0) + order.totalAmount;
      await user.save();

      // Update order payment status
      order.paymentInfo = order.paymentInfo || {};
      order.paymentInfo.status = "Refunded";

      // Create transaction
      await Transaction.create({
        user: user._id,
        transactionId: "TXN-" + Date.now(),
        orderId: order._id,
        paymentMethod: "Wallet",
        amount: order.totalAmount,
        status: "Completed",
        type: "credit",
        referenceId: "WALLET_REFUND_" + Date.now()
      });
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Full order cancelled and refunded to wallet",
      orderStatus: order.status,
      paymentStatus: order.paymentInfo?.status || "Pending"
    });

  } catch (err) {
    console.error("Full order cancel error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.cancelSingleItem = async (req, res) => {
    console.log("Cancel item request:", req.body);
    try {

        const { orderId, productId } = req.body;

        const order = await Order.findById(orderId).populate("user","name");

if (!order) {
    return res.status(404).json({ message: "Order not found" });
}

        const item = order.items.find(i => i.product.toString() === productId);

        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }
        if (item.status === "Cancelled") {
    return res.status(400).json({ message: "Item already cancelled" });
}

        item.status = "Cancelled";
        const activeItems = order.items.filter(i => i.status !== "Cancelled");
        const itemTotal = item.price * item.quantity;

const originalSubtotal = order.subtotal;
const originalTotalAmount = order.totalAmount;

const refundAmount = parseFloat(
  ((itemTotal / originalSubtotal) * originalTotalAmount).toFixed(2)
);
        // Recalculate totals from active items
order.subtotal = activeItems.reduce(
    (sum, i) => sum + (i.price * i.quantity),
    0
);
// ✅ REAPPLY COUPON LOGIC CORRECTLY
if (order.couponCode) {

    const coupon = await Coupon.findOne({
        code: order.couponCode,
        status: "Active"
    });

    if (coupon) {

        // ❗ CHECK MINIMUM ORDER CONDITION
        if (order.subtotal < coupon.minOrderValue) {

            // ❌ Coupon invalid now
            order.discount = 0;

        } else {

            // ✅ Apply discount again
            if (coupon.discountType === "flat") {
                order.discount = coupon.value;
            } else {
                order.discount = (order.subtotal * coupon.value) / 100;
            }

            // safety
            if (order.discount > order.subtotal) {
                order.discount = order.subtotal;
            }
        }

    } else {
        order.discount = 0;
    }

} else {
    order.discount = 0;
}

order.totalAmount = order.subtotal - (order.discount || 0) + (order.shipping || 0);

        if (order.paymentMethod !== "Cash on Delivery") {

            // let wallet = await Wallet.findOne({ user: order.user });

            // if (!wallet) {
            //     wallet = new Wallet({ user: order.user });
            // }

            // wallet.balance += refundAmount;
            const user = await User.findById(order.user);

user.walletBalance = (user.walletBalance || 0) + refundAmount;
await user.save();

            // wallet.transactions.push({
            //     amount: refundAmount,
            //     type: "credit",
            //     description: `Refund for cancelled item (${item.name})`,
            //     status: "Completed"
            // });

            // await wallet.save();

            // ✅ REFUND TRANSACTION
            await Transaction.create({
                user: order.user,
                transactionId: "TXN-" + Date.now() + "-" + Math.floor(Math.random()*1000),
                orderId: "ORD-" + order._id.toString().slice(-5).toUpperCase(),
                paymentMethod: order.paymentMethod,
                amount: refundAmount,
                status: "Completed",
                type: "credit"
            });

        }
        const product = await Product.findById(productId);
if (product) {
    product.stock += item.quantity;
    await product.save();
}
const remainingItems = order.items.filter(i => i.status !== "Cancelled");

if (remainingItems.length === 0) {
    order.status = "Cancelled";
}

        await order.save();

        res.json({ message: "Item cancelled successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
