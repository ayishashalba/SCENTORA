const Wallet = require("../models/Wallet");
const User = require("../models/User");

exports.getWallet = async (req, res) => {
    try {
        let wallet = await Wallet.findOne({ user: req.user.id });

        if (!wallet) {
            wallet = await Wallet.create({
                user: req.user.id,
                balance: 0,
                transactions: []
            });
        }

        res.json({
            balance: wallet.balance || 0,
            transactions: wallet.transactions || []
        });
    } catch (err) {
        console.error("Get wallet error:", err);
        res.status(500).json({ message: "Failed to load wallet" });
    }
};

exports.addMoneyToWallet = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        let wallet = await Wallet.findOne({ user: req.user.id });

        if (!wallet) {
            wallet = await Wallet.create({
                user: req.user.id,
                balance: 0,
                transactions: []
            });
        }

        wallet.balance += Number(amount);
        wallet.transactions.push({
            amount: Number(amount),
            type: "credit",
            description: "Wallet Top-up",
            status: "Completed",
            date: new Date()
        });

        await wallet.save();

        await User.findByIdAndUpdate(req.user.id, {
            walletBalance: wallet.balance
        });

        res.json({
            message: "Money added successfully",
            balance: wallet.balance,
            transactions: wallet.transactions
        });
    } catch (err) {
        console.error("Add wallet money error:", err);
        res.status(500).json({ message: "Failed to add money" });
    }
};