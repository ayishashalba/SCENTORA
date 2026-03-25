const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null
    },
    image: {
        type: String
    },
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    },
    target: [
        {
            type: String,
            enum: ["Men", "Women", "Unisex", "Attars"]
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model("Category", categorySchema);
