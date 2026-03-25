const express = require("express");
const router = express.Router();
const Category = require("../models/Category"); // Adjust the path if needed
const protect = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const adminProtect = require("../middleware/adminProtect");
const multer = require("multer");


const fs = require("fs");
const path = require("path");

const uploadPath = path.join(__dirname, "../uploads/categories");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/categories/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });
// GET ALL CATEGORIES (Admin)
router.get("/", adminProtect, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching categories" });
  }
});

// TOGGLE CATEGORY STATUS
router.put("/toggle/:id", adminProtect, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: "Category not found" });

        category.status = category.status === "Active" ? "Inactive" : "Active";
        await category.save();

        res.json({ message: "Category status updated", status: category.status });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// CREATE CATEGORY
router.post("/", adminProtect, upload.single("image"), async (req, res) => {
    try {
        const imagePath = req.file
            ? `/uploads/categories/${req.file.filename}`
            : "";

        const category = await Category.create({
            name: req.body.name,
            description: req.body.description,
            parent: req.body.parent && req.body.parent !== ""
    ? req.body.parent
    : null,
            image: imagePath,
            target: JSON.parse(req.body.target || "[]"),
            status: req.body.status || "Active"
        });

        res.status(201).json(category);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// UPDATE CATEGORY
router.put("/:id", adminProtect, upload.single("image"), async (req, res) => {
    try {

        let parsedTarget = [];

        if (req.body.target) {
            if (typeof req.body.target === "string") {
                parsedTarget = JSON.parse(req.body.target);
            } else {
                parsedTarget = req.body.target;
            }
        }

        const updateData = {
            name: req.body.name,
            description: req.body.description,
            parent: req.body.parent && req.body.parent !== ""
    ? req.body.parent
    : null,
            status: req.body.status,
            target: parsedTarget
        };

        if (req.file) {
            updateData.image = `/uploads/categories/${req.file.filename}`;
        }

        const updated = await Category.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.json(updated);

    } catch (err) {
        console.error("UPDATE ERROR:", err);
        res.status(500).json({ message: "Update failed", error: err.message });
    }
});
router.get("/categories", async (req, res) => {
    try {

        const categories = await Category.find({ status: "Active" });

        res.json(categories);

    } catch (error) {

        res.status(500).json({ message: "Server error" });

    }
});
router.get("/:id", async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        res.json(category);
    } catch (err) {
        res.status(500).json({ message: "Error fetching category" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: "Category deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting category" });
    }
});


module.exports = router;