const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

router.get("/google", passport.authenticate("google", { 
  scope: ["profile", "email"], 
  prompt: "select_account" 
}));

router.get("/google/callback", (req, res, next) => {

  passport.authenticate("google", { session: false }, async (err, user, info) => {

    const loginUrl = "http://127.0.0.1:5500/frontend/user-side/auth/login.html";
    const homeUrl = "http://127.0.0.1:5500/frontend/user-side/home.html";

    // 🔴 account already exists
    if (info && info.message === "ACCOUNT_EXISTS") {
  return res.redirect(`${loginUrl}?error=account_exists&email=${info.email}`);
}

    if (err || !user) {
      return res.redirect(loginUrl);
    }

    try {

      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.redirect(`${homeUrl}?token=${token}`);

    } catch (error) {
      console.error(error);
      return res.redirect(loginUrl);
    }

  })(req, res, next);

});
module.exports = router;