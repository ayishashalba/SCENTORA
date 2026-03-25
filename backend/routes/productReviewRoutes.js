const express = require("express");
const router = express.Router();
const Review = require("../models/Review");

// ✅ GET reviews for a product (USER SIDE)
router.get("/:productId/reviews", async (req, res) => {
    try {
        const reviews = await Review.find({
            product: req.params.productId,
            status: "Approved" // 🔥 ONLY approved reviews
        }).populate("user", "name");

        res.json({
            success: true,
            data: reviews
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

module.exports = router;