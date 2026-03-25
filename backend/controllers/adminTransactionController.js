const Transaction = require("../models/Transaction");

exports.getAllTransactions = async (req, res) => {
    try {

        const transactions = await Transaction
            .find()
            .sort({ date: -1 });

        res.json(transactions);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};