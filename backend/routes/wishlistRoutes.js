const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product"); // ✅ fixed
const authMiddleware = require("../middleware/authMiddleware");
const checkBlocked = require("../middleware/checkBlocked");

// ADD TO WISHLIST
router.post("/", authMiddleware,checkBlocked, async (req, res) => {
    try {
        const { productId } = req.body;

        // 1️⃣ Check if productId is provided
        if (!productId) {
            return res.status(400).json({ message: "Product ID is required" });
        }

        // 2️⃣ Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        // 3️⃣ Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // 4️⃣ Prevent duplicate entries
        const existing = await Wishlist.findOne({
            user: req.user.id,
            product: productId
        });
        if (existing) {
            return res.status(400).json({ message: "Product already in wishlist" });
        }

        // 5️⃣ Create new wishlist item
        const newItem = await Wishlist.create({
            user: req.user.id,
            product: productId
        });

        // 6️⃣ Populate product safely
        await newItem.populate("product");

        // 7️⃣ Return success response
        res.status(201).json({
            message: "Added to wishlist",
            item: newItem
        });

    } catch (err) {
        console.error("Wishlist POST error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});
router.get("/", authMiddleware, async (req, res) => {
    try {

        const wishlist = await Wishlist.find({
            user: req.user.id
        }).populate("product");

        res.json(wishlist);

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});


router.delete("/:productId", authMiddleware, async (req, res) => {
    try {

        await Wishlist.findOneAndDelete({
            user: req.user.id,
            product: req.params.productId
        });

        res.json({ message: "Removed from wishlist" });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;
