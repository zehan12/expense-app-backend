var passport = require('passport');
var User = require('../models/User');

// GitHubStrategy

var GitHubStrategy = require('passport-github').Strategy;

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: '/auth/github/callback',
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      var profileData = {
        name: profile.displayName,
        username: profile.username,
        photo: profile._json.avatar_url,
      };

      User.findOne({ username: profile.username }, (err, user) => {
        if (err) return cb(err);
        if (!user) {
          User.create(profileData, (err, addeduser) => {
            if (err) return cb(err);
            return cb(null, addeduser);
          });
        } else {
          cb(null, user);
        }
      });
    }
  )
);

var GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      var profileData = {
        name: profile._json.name,
        email: profile._json.email,
        photo: profile._json.picture,
      };

      User.findOne({ email: profile._json.email }, (err, user) => {
        if (err) return cb(err);
        if (!user) {
          User.create(profileData, (err, addeduser) => {
            if (err) return cb(err);
            return cb(null, addeduser);
          });
        } else {
          cb(null, user);
        }
      });
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, 'name email username photo', function (err, user) {
    done(err, user);
  });
});