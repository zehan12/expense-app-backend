const { Router } = require('express');
var express = require('express');
var router = express.Router();
var User = require('../models/User');
var nodemailer = require('nodemailer');
var Token = require('../models/Token');
var crypto = require('crypto');
var bcrypt = require('bcrypt');
var multer = require('multer');
var path = require('path');

var uploadpath = path.join(__dirname, '../public/uploads');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadpath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

/* GET users listing. */
router.get('/register/new', (req, res, next) => {
  var error = req.flash('error')[0];
  var info = req.flash('info')[0];
  res.render('register.ejs', { error, info });
});

router.post('/register/new', upload.single('photo'), (req, res, next) => {
  // console.log(req.body)
  if (req.file) {
    let formatName = req.file.filename.split('.').pop();
    let imageFormats = ['jpg', 'jpeg', 'png', 'gif'];
    if (imageFormats.includes(formatName)) {
      req.body.photo = req.file.filename;
    }
  }
  User.create(req.body, (err, user) => {
    if (err) {
      if (err.name === 'MongoError') {
        req.flash('error', 'This email is already in use');
        return res.redirect('/users/register/new');
      }
      if (err.name === 'ValidationError') {
        req.flash('error', err.message);
        return res.redirect('/users/register/new');
      }
    }
    // generate token and save
    var token = new Token({
      _userId: user._id,
      token: crypto.randomBytes(16).toString('hex'),
    });
    token.save(function (err) {
      if (err) {
        return res.status(500).send({ msg: err.message });
      }

      // Send email (use verified sender's email address & generated API_KEY on SendGrid)
      const transporter = nodemailer.createTransport({
        service: 'Sendgrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_APIKEY,
        },
      });

      var mailOptions = {
        from: 'uttamthakur2999@gmail.com',
        to: user.email,
        subject: 'Account Verification Link',
        text:
          'Hello ' +
          req.body.name +
          ',\n\n' +
          'Please verify your account by clicking the link: \nhttp://' +
          req.headers.host +
          '/confirmation/' +
          user.email +
          '/' +
          token.token +
          '\n\nThank You!\n',
      };

      transporter.sendMail(mailOptions, function (err) {
        if (err) {
          console.log(err);
          req.flash(
            'error',
            'Technical Issue!, Please click on resend for verify your Email.'
          );
          return res.redirect('/users/login');
          // return res.status(500).send({msg:'Technical Issue!, Please click on resend for verify your Email.'});
        } else {
          req.flash(
            'info',
            'A verification email has been sent to ' +
              user.email +
              '. It will be expire after one day. If you not get verification Email click on resend token.'
          );
          return res.redirect('/users/login');
          // return res.status(200).send('A verification email has been sent to ' + user.email + '. It will be expire after one day. If you not get verification Email click on resend token.');
        }
      });
    });
  });
});

// login
router.get('/login', (req, res, next) => {
  var error = req.flash('error')[0];
  var success = req.flash('success')[0];
  let info = req.flash('info')[0];
  res.render('login', { error, success, info });
});

router.post('/login', (req, res, next) => {
  User.findOne({ email: req.body.email }, function (err, user) {
    // error occur
    if (err) {
      return res.status(500).send({ msg: err.message });
    }
    // user is not found in database i.e. user is not registered yet.
    else if (!user) {
      req.flash(
        'error',
        ' The email address ' +
          req.body.email +
          ' is not associated with any account. please check and try again!'
      );
      return res.redirect('/users/login');
      // return res.status(401).send({ msg:'The email address ' + req.body.email + ' is not associated with any account. please check and try again!'});
    }
    // comapre user's password if user is find in above step
    else if (!bcrypt.compareSync(req.body.password, user.password)) {
      req.flash('error', 'Wrong Password!');
      return res.redirect('/users/login');
      // return res.status(401).send({msg:'Wrong Password!'});
    }
    // check user is verified or not
    else if (!user.isVerified) {
      req.flash('error', 'Your Email has not been verified. Check your Email');
      return res.redirect('/users/login');
      // return res.status(401).send({msg:'Your Email has not been verified. Please click on resend'});
    }
    // user successfully logged in
    else {
      req.session.userId = user.id;
      console.log(req.session);
      return res.redirect('/client');
    }
  });
});

//render forgot password page
router.get('/login/forgotpassword', (req, res, next) => {
  let error = req.flash('error')[0];
  let info = req.flash('info')[0];
  res.render('forgotpassword', { error, info });
});

// randomNumber
function randomNumber() {
  let str1 = '0123456789',
    str2 = '';
  for (let i = 0; i <= 5; i++) {
    str2 += str1[Math.floor(Math.random() * 9)];
  }
  return str2;
}

let code = randomNumber();
//process forgot password
router.post('/login/forgotpassword', (req, res, next) => {
  let { email } = req.body;
  req.body.random = code;
  console.log(req.body.random);
  User.findOneAndUpdate({ email }, req.body, (err, user) => {
    if (err) return next(err);
    console.log(user);
    if (!user) {
      req.flash(
        'error',
        'The Email entered is not Registered, Please register!'
      );
      return res.redirect('/users/login/forgotpassword');
    }
    const transporter = nodemailer.createTransport({
      service: 'Sendgrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_APIKEY,
      },
    });

    const mailOptions = {
      from: 'uttamthakur2999@gmail.com',
      to: email,
      subject: 'Verification Email',
      html: `<h1>${req.body.random}</h1>
              <h2>Please Copy above 6 digit number and visit this link http://localhost:3000/users/login/resetpassword/verify </h2>`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) return next(err);
      req.flash('info', 'A verification code has been sent to your email');
      req.session.email = email;
      res.redirect('/users/login/resetpassword/verify');
    });
  });
});

//render reset password verification code page
router.get('/login/resetpassword/verify', (req, res, next) => {
  let error = req.flash('error')[0];
  let info = req.flash('info')[0];
  res.render('resetcode', { error, info });
});

//process verification code
router.post('/login/resetpassword/verify', (req, res, next) => {
  let email = req.session.email;
  let { passcode } = req.body;
  User.findOne({ email }, (err, user) => {
    if (err) return next(err);
    if (passcode == code) {
      return res.redirect('/users/login/resetpassword');
    } else {
      req.flash('error', 'Invalid verification code');
      res.redirect('/users/login/resetpassword/verify');
    }
  });
});

//render reset password page
router.get('/login/resetpassword', (req, res, next) => {
  let error = req.flash('error')[0];
  res.render('resetPassword', { error });
});

//reset password
router.post('/login/resetpassword', (req, res, next) => {
  let { newPasswd1, newPasswd2 } = req.body;
  let email = req.session.email;
  if (newPasswd1 === newPasswd2) {
    User.findOne({ email }, (err, user) => {
      if (err) return next(user);
      bcrypt.hash(newPasswd1, 10, (err, hashed) => {
        if (err) return next(err);
        req.body.password = hashed;
        User.findOneAndUpdate({ email }, req.body, (err, user) => {
          if (err) return next(err);
          req.flash('info', 'Password has been changed Successfully');
          return res.redirect('/users/login');
        });
      });
    });
  } else {
    req.flash('error', 'Password does not match');
    res.redirect('/users/login/resetpassword');
  }
});

// Logout
router.get('/logout', (req, res, next) => {
  console.log(req.session);
  if (!req.session) {
    req.flash('error', 'You must login first');
    res.redirect('/users/login');
  } else {
    req.session.destroy();
    res.clearCookie('connect.sid');
    res.redirect('/');
  }
});

module.exports = router;
