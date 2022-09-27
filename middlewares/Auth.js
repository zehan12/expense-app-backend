var User = require('../models/User');

module.exports = {
  loggedInUser: (req, res, next) => {
    if (req.session && req.session.userId) {
      next();
    } else if (req.session && req.session.passport) {
      next();
    } else {
      res.redirect('/users/login');
    }
  },

  userInfo: (req, res, next) => {
    if (req.session.userId) {
      var userId = req.session && req.session.userId;
      User.findById(userId, 'name email age photo country', (err, user) => {
        if (err) return next(err);
        req.user = user;
        // req.locals.user = user;
        next();
      });
    } else if (req.session.passport) {
      var userId = req.session.passport && req.session.passport.user;
      User.findById(
        userId,
        'name email photo age email country',
        (err, user) => {
          if (err) return next(err);
          req.user = user;
          res.locals.user = user;
          next();
        }
      );
    } else {
      req.user = null;
      res.locals.user = null;
      next();
    }
  },
};