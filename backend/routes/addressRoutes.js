const express = require("express");
const router = express.Router();
const Address = require("../models/Address");
const { addAddress, getAddresses, deleteAddress, updateAddress } = require("../controllers/addressController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ GET all addresses
router.get("/", authMiddleware, async (req, res) => {

    try {
        const addresses = await Address.find({ user: req.user.id });
        res.json(addresses);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }

});


// ✅ ADD new address
router.post("/", authMiddleware, async (req, res) => {

    try {

        const newAddress = new Address({
            user: req.user.id,
            fullName: req.body.fullName,
            phone: req.body.phone,
            house: req.body.house,
            area: req.body.area,
            city: req.body.city,
            state: req.body.state,
            pincode: req.body.pincode
        });

        const savedAddress = await newAddress.save();
        res.status(201).json(savedAddress);

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }

});


// ✅ DELETE address
router.delete("/:id", authMiddleware, async (req, res) => {

    try {

        await Address.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        res.json({ message: "Address deleted" });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }

});


router.post("/", authMiddleware, addAddress);
router.get("/", authMiddleware, getAddresses);
router.delete("/:id", authMiddleware, deleteAddress);
router.put("/:id", authMiddleware, updateAddress);

module.exports = router;
