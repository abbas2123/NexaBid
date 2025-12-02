const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user'); // Capital U for model

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      //  <-- FIXED HERE
      try {
        const email = profile.emails?.[0]?.value;
        if (!email)
          return done(new Error('Email not provided by Google'), null);

        let existingUser = await User.findOne({ email });

        if (existingUser) {
          return done(null, existingUser);
        }

        const newUser = await User.create({
          name: profile.displayName,
          email,
          profilePic: profile.photos?.[0]?.value || null,
          role: 'user',
          authProvider: 'google',
          passwordHash: null,
        });

        return done(null, newUser);
      } catch (error) {
        console.error('Google OAuth Error:', error);
        return done(error, null);
      }
    },
  ),
);

// Store user ID in session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Retrieve user by ID from DB
passport.deserializeUser(async (id, done) => {
  try {
    const userFound = await User.findById(id); // FIXED variable name
    return done(null, userFound);
  } catch (err) {
    return done(err, null);
  }
});

module.exports = passport;
