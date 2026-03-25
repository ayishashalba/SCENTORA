const Order = require ("../models/Order");
const Transaction = require("../models/Transaction");
const razorpay = require("../config/razorpay");

exports.getAllOrders = async (req, res) => {
  try {

    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ date: -1 });

    res.json(orders);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // Validate orderId
    if (!orderId) return res.status(400).json({ message: "Order ID required" });

    const order = await Order.findById(orderId).populate("user", "email name");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const currentStatus = order.status;
    const newStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    // Allowed transitions
    const validTransitions = {
      Pending:["Placed"],
      Placed: ["Packed", "Cancelled"],
      Packed: ["Shipped"],
      Shipped: ["Delivered"],
      Delivered: [],
      Cancelled: []
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return res.status(400).json({ message: `Cannot change status from ${currentStatus} to ${newStatus}` });
    }

    // Update order status
    order.status = newStatus;

    // -------------------
    // Handle payments
    // -------------------
    order.paymentInfo = order.paymentInfo || {};

    // Delivered: mark paid if not COD
    if (newStatus === "Delivered") {
      if (order.paymentMethod !== "Cash on Delivery") {
        order.paymentInfo.status = "Paid";
      }
    }

    // Cancelled: refund if not COD and paid
    if (newStatus === "Cancelled") {
      if (order.paymentMethod !== "Cash on Delivery" && order.paymentInfo.status === "Paid") {
        try {
          const refundAmount = order.totalAmount * 100; // paise for Razorpay
          const refund = await razorpay.payments.refund(order.paymentInfo.razorpayPaymentId, { amount: refundAmount });

          order.paymentInfo.status = "Refunded";

          // Record refund transaction so admin can see it
          await Transaction.create({
            order: order._id,
            user: order.user._id,
            type: "Refund",
            amount: order.totalAmount,
            status: "Completed",
            gateway: order.paymentMethod,
            referenceId: refund.id
          });

          console.log(`Refund successful for order ${orderId}: ${refund.id}`);
        } catch (refundError) {
          console.error("Refund failed:", refundError);
          return res.status(500).json({ message: "Refund failed" });
        }
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      status: order.status,
      paymentStatus: order.paymentInfo.status || "Pending",
    });

  } catch (err) {
    console.error("Update Order Status Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};