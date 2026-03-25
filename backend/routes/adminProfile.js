// routes/adminProfile.js
const express = require('express');
const router = express.Router();

// Mock database (replace with real DB)
let adminProfile = {
    name: "Admin Scentora",
    email: "admin@scentora.com",
    phone: "+91 98765 43210",
    username: "scentora_admin",
    avatar: "https://ui-avatars.com/api/?name=Admin+Scentora&background=2f436e&color=fff&size=128",
    role: "Super Admin",
    createdAt: "Jan 12, 2024",
    lastLogin: "Today, 10:45 AM",
    status: "Active",
    permissions: {
        products: { view: true, add: true, edit: true, delete: true },
        orders: { view: true, add: true, edit: true, delete: false },
        categories: { view: true, add: true, edit: true, delete: false },
        users: { view: true, add: false, edit: true, delete: false },
        reports: { view: true, add: false, edit: false, delete: false },
        transactions: { view: true, add: false, edit: false, delete: false },
        reviews: { view: true, add: false, edit: false, delete: true },
        coupons: { view: true, add: true, edit: true, delete: true },
        settings: { view: true, add: true, edit: true, delete: true }
    }
};

// GET admin profile
router.get('/profile', (req, res) => {
    res.json(adminProfile);
});

// UPDATE admin profile info
router.put('/profile', (req, res) => {
    const { name, email, phone, username, password } = req.body;

    if (name) adminProfile.name = name;
    if (email) adminProfile.email = email;
    if (phone) adminProfile.phone = phone;
    if (username) adminProfile.username = username;
    // For password, hash before storing in production
    if (password) adminProfile.password = password;

    res.json({ message: "Profile updated successfully", data: adminProfile });
});

// UPDATE role & permissions
router.put('/permissions', (req, res) => {
    const { role, permissions } = req.body;
    if (role) adminProfile.role = role;
    if (permissions) adminProfile.permissions = permissions;

    res.json({ message: "Role and permissions updated", data: adminProfile });
});

module.exports = router;
