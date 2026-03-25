const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/adminTransactionController");

router.get("/", transactionController.getAllTransactions);

module.exports = router;