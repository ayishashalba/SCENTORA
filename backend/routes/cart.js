const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const auth = require("../middleware/authMiddleware");
const checkBlocked = require("../middleware/checkBlocked");

// GET Cart
router.get("/", auth, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
        if (!cart) return res.json({ items: [] });
        res.json(cart);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});



// POST Add product to cart
router.post("/", auth,checkBlocked, async (req, res) => {
    const productId = req.body.productId || req.body.product;
    const quantity = req.body.quantity || 1;

    if (!productId) return res.status(400).json({ message: "Product ID required" });

    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) cart = new Cart({ user: req.user.id, items: [] });

        const itemIndex = cart.items.findIndex(
            (item) => item.product.toString() === productId
        );

        let alreadyInCartQty = itemIndex > -1 ? cart.items[itemIndex].quantity : 0;
        let remainingStock = product.stock - alreadyInCartQty;

        if (remainingStock <= 0) {
            return res.status(400).json({ message: "Already in Cart" });
        }

        let addQty = Math.min(quantity, remainingStock);

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += addQty;
        } else {
            cart.items.push({ product: productId, quantity: addQty });
        }

        await cart.save();
        cart = await cart.populate("items.product");

        res.json({ message: addQty < quantity ? `Only ${addQty} added, stock limit` : "Added to cart", cart });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH Update quantity
router.patch("/:productId", auth, async (req, res) => {
    const { quantityType } = req.body;
    const { productId } = req.params;

    try {
        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        const item = cart.items.find((i) => i.product.toString() === productId);
        if (!item) return res.status(404).json({ message: "Product not in cart" });

const product = await Product.findById(productId);

if (quantityType === "increase") {

    if (item.quantity + 1 > product.stock) {
        return res.status(400).json({
    message: "Stock limit reached",
    availableStock: product.stock
});
    }

    item.quantity += 1;
}

if (quantityType === "decrease" && item.quantity > 1) {
    item.quantity -= 1;
}

await cart.save();
cart = await cart.populate("items.product");
res.json(cart);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE Remove product
router.delete("/:productId", auth, async (req, res) => {
    const { productId } = req.params;

    try {
        let cart = await Cart.findOne({ user: req.user.id });

        if (!cart) return res.status(404).json({ message: "Cart not found" });

        cart.items = cart.items.filter(
            (item) => item.product.toString() !== productId
        );

        await cart.save();

        cart = await cart.populate("items.product");

        res.json(cart);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
