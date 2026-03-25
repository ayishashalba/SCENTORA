const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                name: { type: String, required: true },
                price: { type: Number, required: true },
                quantity: { type: Number, required: true },
                image: { type: String, default: "assets/images/default.png" },
                status: {
      type: String,
      enum: ["Pending", "Placed", "Packed", "Shipped", "Delivered", "Cancelled"],
      default: "Placed"
    },
            },
        ],

        address: {
  fullName: String,
  phone: String,
  house: String,
  city: String,
  state: String,
  pincode: String
}
,

        paymentMethod: {
            type: String,
            default: "Cash on Delivery",
        },

        subtotal: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        shipping: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        
        status: {
            type: String,
            default: "Placed", // or "Pending"
        },
        paymentInfo: {
            method: { type: String },
            status: { type: String }
        },
        coupon: {
    code: String,
    discountType: String,
    value: Number
},


    },
    { timestamps: true }
);

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
