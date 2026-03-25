const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    fullName: String,
    phone: String,
    pincode: String,
    state: String,
    city: String,
    house: String,
    landmark: String,
    isDefault: Boolean
}, { timestamps: true });

module.exports = mongoose.model("Address", addressSchema);
