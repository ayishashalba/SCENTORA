const Product = require('../models/Product');
const fs = require("fs");
const path = require("path");
const { filterProducts } = require('./filterController');

const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, status } = req.body;

    const imagePath = req.file ? "uploads/" + req.file.filename : null;

    const product = new Product({
      name,
      description,
      price,
      category,
      stock,
      status,
      image: imagePath
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
const updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, status } = req.body;

    const updatedData = {};

    if (name) updatedData.name = name;
    if (description) updatedData.description = description;
    if (category) updatedData.category = category;
    if (status) updatedData.status = status;

    if (price !== undefined && price !== "") {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({ message: "Invalid price" });
      }
      updatedData.price = numPrice;
    }

    if (stock !== undefined && stock !== "") {
      const numStock = Number(stock);
      if (isNaN(numStock) || numStock < 0) {
        return res.status(400).json({ message: "Invalid stock" });
      }
      updatedData.stock = numStock;
    }

    if (req.file) {
      updatedData.image = "uploads/" + req.file.filename;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updatedData },
      { new: true }
    );

    res.json(updatedProduct);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
};
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({ product });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

module.exports = { createProduct, getProductById, updateProduct, filterProducts };