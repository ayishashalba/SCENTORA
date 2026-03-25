const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({

    name: { type: String, required: true },

    category: { type: String, required: true }, 
    // Floral, Woody, Spicy etc

    target: [{ type: String }],
    // ["Men", "Women", "Unisex", "Attars"]

    size: [{ type: String }],
    // ["50ml", "100ml"]

    availability: {
        type: String,
        enum: ["instock", "outofstock"],
        default: "instock"
    },

    price: { type: Number, required: true},

    stock: { type: Number, required: true },

    description: { type: String },

    status: { type: String, default: "active" },

    image: { type: String }

}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);