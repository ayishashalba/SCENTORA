const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
dotenv.config();
connectDB();

require("./config/googleAuth"); // ✅ VERY IMPORTANT

const app = express();


// ================= MIDDLEWARE =================

// CORS (Allow frontend)
app.use(cors({
  origin: "http://127.0.0.1:5500",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));


// ================= SESSION =================
app.use(session({
  secret: "scentora_secret",
  resave: false,
  saveUninitialized: false
}));

// ================= PASSPORT =================
app.use(passport.initialize());
app.use(passport.session());

// ================= ROUTES =================

app.use("/api/auth", require("./routes/googleAuthRoutes")); // This makes the route: /api/auth/google
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/address", require("./routes/addressRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/filter",require("./routes/filterRoutes"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/products", require("./routes/productReviewRoutes"));

// Admin
// app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/admin", require("./routes/adminAuthRoutes"));
app.use("/api/admin/dashboard", require("./routes/adminDashboardRoutes"));
app.use("/api/admin", require("./routes/adminUserRoutes"));
app.use("/api/admin/categories", require("./routes/adminCategoriesRoutes"));
app.use("/api/admin/coupons", require("./routes/adminCoupon"));
app.use("/api/admin/payments", require("./routes/adminPaymentRoutes"));
app.use("/api/admin/orders", require("./routes/adminOrderRoutes"));
app.use("/api/admin/reports", require("./routes/adminReportsRoutes"));
app.use("/api/admin/transactions", require("./routes/adminTransactionRoutes"));
app.use("/api/admin/reviews", require("./routes/adminReviewRoutes"));
app.use("/api/admin", require("./routes/adminSettingsRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/transactions", require("./routes/transactionRoutes"));

// Serve frontend
app.use(express.static(path.join(__dirname, "frontend")));
// ================= TEST =================
app.get("/", (req, res) => {
  res.send("Scentora Backend Running...");
});


// ================= START =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});