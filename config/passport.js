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
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) return done(new Error('Google did not return email'), null);

        // Step 1: Find user by Google Id first
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Step 2: Find user by email
        user = await User.findOne({ email });

        if (user) {
          // If existing NORMAL user (local auth)
          if (!user.googleId) {
            // ❌ Block login via Google
            return done(null, false, {
              message: 'email_exists_password_login_required',
            });
          }

          // Should not reach here normally
          return done(null, user);
        }

        // Step 3: Create a NEW GOOGLE user
        const newUser = await User.create({
          name: profile.displayName,
          email,
          googleId: profile.id,
          authProvider: 'google',
          profilePic: profile.photos?.[0]?.value || null,
          role: 'user',
          status: 'active',
        });

        return done(null, newUser);
      } catch (error) {
        console.error('Google OAuth Error:', error);
        return done(error, null);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const userFound = await User.findById(id);
    return done(null, userFound);
  } catch (err) {
    return done(err, null);
  }
});

module.exports = passport;
