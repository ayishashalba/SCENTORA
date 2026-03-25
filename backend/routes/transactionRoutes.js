const express = require("express");
const router = express.Router();

const { getUserTransactions } = require("../controllers/transactionController");
const authMiddleware = require("../middleware/authMiddleware");

// Get user transactions
router.get("/", authMiddleware, getUserTransactions);

module.exports = router;