const express = require("express");
const Product = require("../models/Product");
const multer = require("multer");
const path = require("path");
const { createProduct,getProductById,updateProduct } = require("../controllers/productController");
const productController = require("../controllers/productController");

const router = express.Router();

// ================= MULTER CONFIG =================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.post("/", upload.single("image"), createProduct);
router.get("/:id", getProductById);
router.put("/:id", upload.single("image"), updateProduct);

// ================= GET ALL PRODUCTS =================
router.get("/", async (req, res) => {
    try {

        const { gender } = req.query;
        const filter = gender ? { gender } : {};

        const products = await Product.find(filter)
            .sort({ createdAt: -1 });

        res.json(products);

    } catch (error) {
        console.error("Product fetch error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});



// ================= GET SINGLE PRODUCT =================
router.get("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(product);

    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});


// ================= ADD PRODUCT WITH IMAGE =================
router.post("/", async (req, res) => {
    try {
        const { name, category, price, stock, description, status, images } = req.body;

        if (!name || !price || !category || !stock) {
            return res.status(400).json({ message: "Name, price, category, and stock are required" });
        }

        const product = new Product({
            name,
            category,
            price,
            stock,
            description,
            status,
            images: Array.isArray(images) ? images : [images] // make sure it’s an array
        });

        const savedProduct = await product.save();

        res.status(201).json(savedProduct);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// ================= UPDATE PRODUCT ============
router.put("/:id", async (req, res) => {
    try {
        const { name, category, price, stock, description, status, images } = req.body;

        const updatedData = {
            name,
            category,
            price,
            stock,
            description: description || "",
            status: status || "active",
            images: Array.isArray(images) ? images : [images || ""]
        };

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updatedData, { new: true });

        if (!updatedProduct) return res.status(404).json({ message: "Product not found" });

        res.json({ message: "Product updated successfully", product: updatedProduct });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


// ================= DELETE PRODUCT =================
router.delete("/:id", async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Delete failed" });
    }
});

module.exports = router;
