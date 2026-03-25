const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../models/User");
const Wallet = require("../models/Wallet");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    },

    async (accessToken, refreshToken, profile, done) => {

      try {

        const email = profile.emails[0].value;

let user = await User.findOne({ email });

if (user) {
  return done(null, false, { 
    message: "ACCOUNT_EXISTS",
    email: email
  });
}

        // 🟢 CREATE NEW USER
        user = await User.create({
          fullName: profile.displayName,
          email: email,
          googleId: profile.id,
          isVerified: true
        });

        // create wallet
        await Wallet.create({
          user: user._id,
          balance: 500
        });

        return done(null, user);

      } catch (error) {
        return done(error, null);
      }

    }
  )
);

module.exports = passport;