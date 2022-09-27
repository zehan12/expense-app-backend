let express = require('express');
let router = express.Router();
let Income = require('../models/Income');
let User = require('../models/User');
let moment = require('moment');
var auth = require('../middlewares/Auth');

router.use(auth.loggedInUser);

//render income details page
router.get('/:id', (req, res, next) => {
  let id = req.params.id;
  Income.findById(id, (err, income) => {
    if (err) return next(err);
    console.log(income);
    let date = moment(income.date).format('DD/MM/YYYY');
    console.log(date);
    res.render('incomeDetails', { income, date });
  });
});

//render income edit page
router.get('/:id/edit', (req, res, next) => {
  let id = req.params.id;
  Income.findById(id, (err, income) => {
    if (err) return next(err);
    income.sources = income.sources.join(' ');
    res.render('incomeEditPage', { income });
  });
});

//edit income
router.post('/:id', (req, res, next) => {
  let id = req.params.id;
  req.body.sources = req.body.sources.trim().split(' ');
  Income.findByIdAndUpdate(id, req.body, (err, income) => {
    if (err) return next(err);
    res.redirect('/client/statementList');
  });
});

//delete income
router.get('/:id/delete', (req, res, next) => {
  let id = req.params.id;
  Income.findByIdAndDelete(id, (err, income) => {
    if (err) return next(err);
    User.findByIdAndUpdate(
      income.userId,
      { $pull: { incomes: id } },
      (err, user) => {
        if (err) return next(err);
        res.redirect('/client/statementList');
      }
    );
  });
});
module.exports = router;