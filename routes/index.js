var express = require('express');
var router = express.Router();
var passport = require('passport');
var Token = require('../models/Token');
var User = require('../models/User');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

//github and google authentication

// GITHUB

router.get('/auth/github', passport.authenticate('github'));

router.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/users/login' }),
  function (req, res) {
    res.redirect('/client');
  }
);

// google strategy
router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/users/login' }),
  function (req, res) {
    console.log(req.session);
    res.redirect('/client');
  }
);

// email confirmation

router.get('/confirmation/:email/:token', (req, res, next) => {
  Token.findOne({ token: req.params.token }, function (err, token) {
    // token is not found into database i.e. token may have expired
    if (!token) {
      return res.status(400).send({
        msg: 'Your verification link may have expired. Please click on resend for verify your Email.',
      });
    }
    // if token is found then check valid user
    else {
      User.findOne(
        { _id: token._userId, email: req.params.email },
        function (err, user) {
          // not valid user
          if (!user) {
            return res.status(401).send({
              msg: 'We were unable to find a user for this verification. Please SignUp!',
            });
          }
          // user is already verified
          else if (user.isVerified) {
            req.flash('info', 'User has been already verified. Please Login');
            return res.redirect('/users/login');
            // return res.status(200).send('User has been already verified. Please Login');
          }
          // verify user
          else {
            // change isVerified to true
            user.isVerified = true;
            user.save(function (err) {
              // error occur
              if (err) {
                return res.status(500).send({ msg: err.message });
              }
              // account successfully verified
              else {
                // req.flash('info', 'Your account has been successfully verified')
                // return res.redirect('/users/login')
                res.setHeader('content-type', 'text/html');
                res.end(
                  `<img style="display : block; width:300px; margin : auto;" src="/images/success.gif" alt="success image" />
                           <h2 style="text-align:center; font-size:25px;">Your account has been successfully verified</h2>`
                );

                // return res.status(200).send('Your account has been successfully verified');
              }
            });
          }
        }
      );
    }
  });
});

module.exports = router;