const Address = require("../models/Address");

// ADD ADDRESS
const addAddress = async (req, res) => {
    try {
        const newAddress = await Address.create({
            user: req.user.id,
            fullName: req.body.fullName,
            phone: req.body.phone,
            pincode: req.body.pincode,
            state: req.body.state,
            city: req.body.city,
            house: req.body.house,
            landmark: req.body.landmark,
            isDefault: req.body.isDefault
        });

        res.status(201).json(newAddress);

    } catch (error) {
        console.log(error);   // VERY IMPORTANT
        res.status(500).json({ message: "Server error" });
    }
};

// GET ADDRESSES
const getAddresses = async (req, res) => {
    try {
        const addresses = await Address.find({ user: req.user.id });
        res.json(addresses);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

// DELETE ADDRESS
const deleteAddress = async (req, res) => {
    try {
        await Address.findByIdAndDelete(req.params.id);
        res.json({ message: "Address deleted" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};
// UPDATE ADDRESS
const updateAddress = async (req, res) => {
    try {
        const addressId = req.params.id;

        // Find the address and ensure it belongs to the user
        const address = await Address.findOne({ _id: addressId, user: req.user.id });
        if (!address) {
            return res.status(404).json({ message: "Address not found" });
        }

        // Update fields
        address.fullName = req.body.fullName || address.fullName;
        address.phone = req.body.phone || address.phone;
        address.pincode = req.body.pincode || address.pincode;
        address.state = req.body.state || address.state;
        address.city = req.body.city || address.city;
        address.house = req.body.house || address.house;
        address.landmark = req.body.landmark || address.landmark;
        address.addressType = req.body.addressType || address.addressType;
        address.isDefault = req.body.isDefault !== undefined ? req.body.isDefault : address.isDefault;

        const updated = await address.save();

        res.json(updated);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    addAddress,
    getAddresses,
    deleteAddress,
    updateAddress
};
