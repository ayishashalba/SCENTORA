const Admin = require("../models/Admin");

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        const token = Math.random().toString(36).substring(2);

        admin.resetToken = token;
        await admin.save();

        console.log(`Reset link: http://localhost:5500/reset-password.html?token=${token}`);

        res.json({ message: "Reset link sent" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};