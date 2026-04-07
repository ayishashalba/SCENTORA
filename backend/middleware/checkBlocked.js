const User = require("../models/User");

const checkBlocked = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    if (req.user.isBlocked) {
      return res.status(403).json({ message: "Your account is blocked" });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = checkBlocked;