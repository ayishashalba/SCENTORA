const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const sendEmail = require("../utils/sendEmail");
const Wallet = require("../models/Wallet");

const router = express.Router();

// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    console.log("REGISTER BODY:", req.body);

    const { name, email, password, phone } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    console.log("REGISTER EMAIL:", cleanEmail);

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email: cleanEmail });
    console.log("USER EXISTS:", userExists);

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const user = await User.create({
      fullName: name,
      email: cleanEmail,
      password: hashedPassword,
      phone,
      otp,
      otpExpiry: Date.now() + 5 * 60 * 1000
    });

    console.log("USER CREATED:", user.email, user._id);

    await sendEmail(cleanEmail, otp);
    console.log("OTP email sent successfully");

    const defaultBalance = 100;
    const newWallet = new Wallet({
      user: user._id,
      balance: defaultBalance,
      transactions: [
        {
          date: new Date(),
          type: "credit",
          description: "Welcome Bonus",
          status: "Completed",
          amount: defaultBalance
        }
      ]
    });

    await newWallet.save();

    res.status(201).json({
      message: "Signup successful. OTP sent to email.",
      email: user.email
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= VERIFY OTP =================
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (user.otpExpiry < Date.now()) return res.status(400).json({ message: "OTP expired" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: "Account verified successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= RESEND OTP =================
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;
    await user.save();
    await sendEmail(email, otp);

    res.json({ message: "New OTP sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
     if (user.isBlocked) {
            return res.status(403).json({ message: "Your account is blocked." });
        }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.fullName, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= FORGOT PASSWORD =================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.resetOtp = otp;
    user.resetOtpExpiry = Date.now() + 5 * 60 * 1000;
    await user.save();
    await sendEmail(email, otp);

    res.json({ message: "Password reset OTP sent to email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= RESET PASSWORD =================
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.resetOtp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (user.resetOtpExpiry < Date.now()) return res.status(400).json({ message: "OTP expired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= GET PROFILE =================
router.get("/profile", protect, async (req, res) => {
  res.json(req.user);
});

// ================= UPDATE PROFILE =================
router.put("/profile", protect, async (req, res) => {
  try {
    const { fullName, phone, password, dob, gender} = req.body;

    let updateData = {
      fullName,
      phone,
      gender,
      dob: dob ? new Date(dob) : undefined,
    };

    // If password is sent → hash & save
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    res.json(updatedUser);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while updating profile" });
  }
});

// ================= CHANGE PASSWORD =================
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword)
      return res.status(400).json({ message: "All fields are required" });

    if (newPassword !== confirmPassword)
      return res.status(400).json({ message: "New password and confirm password do not match" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password updated successfully ✅" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while changing password" });
  }
});

router.get("/me", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "No token" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);

    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
});

module.exports = router;