const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    paymentId: {
        type: String,
        required: true
    },

    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    amount: {
        type: Number,
        required: true
    },

    method: {
        type: String,
        enum: ["COD", "Credit Card", "Debit Card", "UPI", "Wallet"],
        required: true
    },

    status: {
        type: String,
        enum: ["Pending", "Completed", "Failed", "Refunded"],
        default: "Pending"
    }

}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
