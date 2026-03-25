const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    type: { type: String, enum: ["credit","debit"], required: true },
    amount: { type: Number, required: true },
    description: String,
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ["Completed","Pending","Failed"], default: "Completed" }
});

const walletSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance: { type: Number, default: 0 },
    transactions: [transactionSchema]
}, { timestamps: true });

module.exports = mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);
