const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    user: {                    // ⭐ ADD THIS
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    transactionId: {
        type: String,
        unique: true,
        required: true
    },
    orderId: {
        type: String,
        default: null
    },
    paymentMethod: {
        type: String,
        default: null
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        default: "Pending"
    },
    type: {
        type: String,
        enum: ["credit", "debit"],
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Transaction", transactionSchema);