// models/Coupon.js
const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountType: { type: String, enum: ["flat", "percentage"], required: true },
  value: { type: Number, required: true },
  minOrder: { type: Number, required: true },
  startDate: {type:Date},
  expiryDate: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Coupon", couponSchema);
