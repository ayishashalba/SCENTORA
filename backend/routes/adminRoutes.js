const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/auth'); // JWT validation
const adminController = require('../controllers/adminTransactionController');
const { forgotPassword } = require("../controllers/adminController");

// GET admin profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const admin = await Admin.findById(req.adminId).select('-password -__v -activeToken');
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        res.json(admin);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// UPDATE admin profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name, email, phone, username, password } = req.body;
        const updateData = { name, email, updatedAt: new Date() };

        if (password) updateData.password = await bcrypt.hash(password, 10);

        const updatedAdmin = await Admin.findByIdAndUpdate(req.adminId, updateData, { new: true }).select('-password -__v -activeToken');
        res.json({ message: 'Profile updated', data: updatedAdmin });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// UPDATE role & permissions
router.put('/permissions', authMiddleware, async (req, res) => {
    try {
        const { role, permissions } = req.body;
        const updatedAdmin = await Admin.findByIdAndUpdate(
            req.adminId,
            { role, permissions, updatedAt: new Date() },
            { new: true }
        ).select('-password -__v -activeToken');

        res.json({ message: 'Permissions updated', data: updatedAdmin });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get("/transactions", adminAuth, adminController.getTransactions);

router.post("/forgot-password", forgotPassword);


module.exports = router;
