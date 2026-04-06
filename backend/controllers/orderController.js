const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Wallet = require("../models/Wallet");
const Product = require("../models/Product");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Coupon = require("../models/Coupon");

async function ensureWallet(userId) {
    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
        wallet = await Wallet.create({
            user: userId,
            balance: 0,
            transactions: []
        });
    }

    return wallet;
}

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
        let coupon = null;

        if (couponCode) {
    coupon = await Coupon.findOne({
        code: { $regex: `^${String(couponCode).trim()}$`, $options: "i" },
        $or: [
            { isActive: true },
            { isActive: { $exists: false } }
        ]
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
    const wallet = await ensureWallet(req.user.id);

    if (!user || (user.walletBalance || 0) < totalAmount || (wallet.balance || 0) < totalAmount) {
        return res.status(400).json({
            message: "Insufficient wallet balance"
        });
    }

    user.walletBalance -= totalAmount;
    await user.save();

    wallet.balance -= totalAmount;
    wallet.transactions.push({
        amount: totalAmount,
        type: "debit",
        description: "Wallet payment for order",
        status: "Completed",
        date: new Date()
    });
    await wallet.save();
}

const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    address,
    subtotal,
    discount,
    couponCode: coupon ? coupon.code : null,
    couponMinOrder: coupon ? coupon.minOrder : null,
    couponDiscountType: coupon ? coupon.discountType : null,
    couponValue: coupon ? coupon.value : null,
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
    if ((order.paymentMethod || "").trim().toLowerCase() !== "cash on delivery" &&
    order.paymentInfo?.status !== "Refunded") {

    const userId = order.user?._id || order.user;

    const user = await User.findById(userId);
    const wallet = await ensureWallet(userId);

    if (!user) {
        return res.status(404).json({ message: "User not found for refund" });
    }

    wallet.balance = Number(wallet.balance || 0) + Number(order.totalAmount);
    wallet.transactions = wallet.transactions || [];

    wallet.transactions.push({
        amount: Number(order.totalAmount),
        type: "credit",
        description: `Refund for cancelled order (${order._id})`,
        status: "Completed",
        date: new Date()
    });

    await wallet.save();

    user.walletBalance = Number(user.walletBalance || 0) + Number(order.totalAmount);
    await user.save();

    order.paymentInfo = order.paymentInfo || {};
    order.paymentInfo.status = "Refunded";

    await Transaction.create({
        user: userId,
        transactionId: "TXN-" + Date.now(),
        orderId: "ORD-" + order._id.toString().slice(-5).toUpperCase(),
        paymentMethod: "Wallet",
        amount: Number(order.totalAmount),
        status: "Completed",
        type: "credit",
        referenceId: "WALLET_REFUND_" + Date.now()
    });

    console.log("Full refund saved to wallet:", {
        userId,
        refundAmount: order.totalAmount,
        walletBalance: wallet.balance,
        txCount: wallet.transactions.length
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

        const order = await Order.findById(orderId).populate("user", "name");
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

        const originalTotalAmount = Number(order.totalAmount || 0);
        const originalDiscount = Number(order.discount || 0);

        item.status = "Cancelled";

        const activeItems = order.items.filter(i => i.status !== "Cancelled");

        order.subtotal = activeItems.reduce(
            (sum, i) => sum + (Number(i.price) * Number(i.quantity)),
            0
        );

        // Recalculate coupon/discount
        // Recalculate coupon/discount
if (order.couponCode && order.couponMinOrder != null) {
    if (order.subtotal < Number(order.couponMinOrder || 0)) {
        order.discount = 0;
        order.couponCode = null;
    } else {
        if (order.couponDiscountType === "flat") {
            order.discount = Number(order.couponValue || 0);
        } else {
            order.discount = (order.subtotal * Number(order.couponValue || 0)) / 100;
        }

        if (order.discount > order.subtotal) {
            order.discount = order.subtotal;
        }
    }
} else {
    order.discount = 0;
}

        order.totalAmount = Number(order.subtotal || 0) - Number(order.discount || 0) + Number(order.shipping || 0);

        const refundAmount = parseFloat(
            (originalTotalAmount - order.totalAmount).toFixed(2)
        );

        if (refundAmount < 0) {
            return res.status(400).json({ message: "Refund calculation error" });
        }

        if ((order.paymentMethod || "").trim().toLowerCase() !== "cash on delivery") {
            const userId = order.user?._id || order.user;

            const user = await User.findById(userId);
            const wallet = await ensureWallet(userId);

            if (!user) {
                return res.status(404).json({ message: "User not found for refund" });
            }

            wallet.balance = Number(wallet.balance || 0) + Number(refundAmount);
            wallet.transactions = wallet.transactions || [];

            wallet.transactions.push({
                amount: Number(refundAmount),
                type: "credit",
                description: `Refund for cancelled item (${item.name})`,
                status: "Completed",
                date: new Date()
            });

            await wallet.save();

            user.walletBalance = Number(user.walletBalance || 0) + Number(refundAmount);
            await user.save();

            await Transaction.create({
                user: userId,
                transactionId: "TXN-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
                orderId: "ORD-" + order._id.toString().slice(-5).toUpperCase(),
                paymentMethod: order.paymentMethod,
                amount: Number(refundAmount),
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
        console.log("AFTER CANCEL subtotal:", order.subtotal);
console.log("AFTER CANCEL discount:", order.discount);
console.log("AFTER CANCEL totalAmount:", order.totalAmount);
console.log("AFTER CANCEL couponCode:", order.couponCode);

        await order.save();

        res.json({
            message: "Item cancelled successfully",
            refundAmount,
            subtotal: order.subtotal,
            discount: order.discount,
            totalAmount: order.totalAmount,
            couponCode: order.couponCode
        });

    } catch (err) {
        console.error("cancelSingleItem error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
