const Transaction = require("../models/Transaction");

// Get transactions for logged-in user
const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    const transactions = await Transaction.find({ user: userId })
      .sort({ date: -1 });

    res.json({
      success: true,
      transactions
    });

  } catch (error) {
    console.error("Fetch transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching transactions"
    });
  }
};

module.exports = { getUserTransactions };