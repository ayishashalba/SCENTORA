const Order = require("../models/Order");
const Transaction = require("../models/Transaction");

const codOrderController = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, products, paymentMethod } = req.body;

        if (!amount || !products || products.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid order data" });
        }

        // 1️⃣ Create Order
        const newOrder = new Order({
            user: userId,
            products,
            amount,
            paymentMethod: paymentMethod || "COD",
            status: "Pending",
            createdAt: new Date()
        });

        const savedOrder = await newOrder.save();  // ✅ Wait for save

        // 2️⃣ Create Transaction linked to saved order
        const newTransaction = new Transaction({
            user:userId,
            transactionId: `TXN${Date.now()}`,
            orderId: savedOrder._id,                 // ✅ Link correctly
            paymentMethod: paymentMethod || "COD",
            amount,
            type: "debit",
            status: "Pending",
            date: new Date()
        });

        await newTransaction.save();

        res.json({ success: true, order: savedOrder, transaction: newTransaction });

    } catch (err) {
        console.error("COD order error:", err);
        res.status(500).json({ success: false, message: "Server error while placing COD order" });
    }
};

const onlinePaymentController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { products, totalAmount, paymentMethod } = req.body;
    const Product = require("../models/Product"); // ✅ add this

    const newOrder = new Order({
      user: userId,
      products,
      totalAmount: totalAmount,
      paymentMethod: paymentMethod || "Razorpay",
      status: "Placed",
      createdAt: new Date()
    });

    const savedOrder = await newOrder.save();

    console.log("Order saved:", savedOrder._id);

    const newTransaction = new Transaction({
      user: userId,
      transactionId: `TXN${Date.now()}`,
      orderId: savedOrder._id,
      paymentMethod: "Razorpay",
      amount: totalAmount,
      type: "debit",
      status: "Success"
    });

    console.log("Creating transaction...");

    const savedTransaction = await newTransaction.save();

    console.log("Transaction saved:", savedTransaction);

    res.json({
      success: true,
      order: savedOrder,
      transaction: savedTransaction
    });

  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while processing payment"
    });
  }
};

module.exports = { codOrderController, onlinePaymentController};