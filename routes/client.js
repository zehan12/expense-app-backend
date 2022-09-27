var express = require('express');
var router = express.Router();
var User = require('../models/User');
var auth = require('../middlewares/Auth');
var moment = require('moment');
let Income = require('../models/Income');
let Expense = require('../models/Expense');

router.use(auth.loggedInUser);

router.get('/', (req, res, next) => {
  let user = req.user;
  res.render('single', { user });
});

router.use((req, res, next) => {
  let expenses = [];
  let incomes = [];
  let date = new Date();
  let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  Expense.find(
    {
      date: {
        $gte: firstDay,
        $lt: lastDay,
      },
      userId: req.user.id,
    },
    (err, expenses) => {
      if (err) return next(err);
      Income.find(
        {
          date: {
            $gte: firstDay,
            $lt: lastDay,
          },
          userId: req.user.id,
        },
        (err, incomes) => {
          if (err) return next(err);
          let sumOfExpenses = expenses.reduce(
            (acc, curr) => acc + Number(curr.amount),
            0
          );
          let sumOfIncomes = incomes.reduce(
            (acc, curr) => acc + Number(curr.amount),
            0
          );
          let savings = sumOfIncomes - sumOfExpenses;
          res.locals.savings = savings;
          res.locals.balance = 0;
          next();
        }
      );
    }
  );
});

//render income create form
router.get('/income/new', (req, res, next) => {
  let info = req.flash('info')[0];
  res.render('incomeCreateForm', { info });
});

//add income
router.post('/income', (req, res, next) => {
  req.body.userId = req.user.id;
  req.body.sources = req.body.sources
    .trim()
    .split(' ')
    .map((e) => e.toLowerCase());
  Income.create(req.body, (err, income) => {
    if (err) return next(err);
    console.log(income);
    User.findByIdAndUpdate(
      req.user.id,
      { $push: { incomes: income.id } },
      (err, user) => {
        if (err) return next(err);
        req.flash('info', 'Income is added');
        res.redirect('/client/income/new');
      }
    );
  });
});

//render expense create form
router.get('/expense/new', (req, res, next) => {
  let info = req.flash('info')[0];
  res.render('expenseCreateForm', { info });
});

//add expense
router.post('/expense', (req, res, next) => {
  req.body.userId = req.user.id;
  req.body.category = req.body.category
    .trim()
    .split(' ')
    .map((e) => e.toLowerCase());
  Expense.create(req.body, (err, expense) => {
    if (err) return next(err);
    User.findByIdAndUpdate(
      req.user.id,
      { $push: { expenses: expense.id } },
      (err, user) => {
        if (err) return next(err);
        req.flash('info', 'Expense is added');
        res.redirect('/client/expense/new');
      }
    );
  });
});

let date = new Date();
let currentMonth = moment(date).format('MMMM');
//render statement page(income and expense list)
router.get('/statementList', (req, res, next) => {
  let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  Expense.find(
    {
      userId: req.user.id,
      date: {
        $gte: firstDay,
        $lt: lastDay,
      },
    },
    (err, expenses) => {
      if (err) return next(err);
      console.log(expenses);
      Income.find(
        {
          date: {
            $gte: firstDay,
            $lt: lastDay,
          },
          userId: req.user.id,
        },
        (err, incomes) => {
          if (err) return next(err);

          res.render('incomeExpenseStatement', {
            expenses,
            incomes,
            currentMonth,
          });
        }
      );
    }
  );
});

//filter by date
router.get('/statementList/filterByDate', (req, res, next) => {
  let expenses = [];
  let incomes = [];
  let { startDate, endDate } = req.query;
  Income.find(
    {
      userId: req.user.id,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    },
    (err, incomes) => {
      if (err) return next(err);
      Expense.find(
        {
          userId: req.user.id,
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
        (err, expenses) => {
          if (err) return next(err);
          let sumOfExpenses = expenses.reduce(
            (acc, curr) => acc + Number(curr.amount),
            0
          );
          let sumOfIncomes = incomes.reduce(
            (acc, curr) => acc + Number(curr.amount),
            0
          );
          let balance = sumOfIncomes - sumOfExpenses;
          res.render('incomeExpenseStatement', {
            incomes,
            expenses,
            balance,
            currentMonth,
          });
        }
      );
    }
  );
});

//filter by month
router.get('/statementList/filterByMonth', (req, res, next) => {
  let expenses = [];
  let incomes = [];
  let year = req.query.month.split('-')[0];
  let month = req.query.month.split('-')[1];
  let date = year + '-' + month + '-' + '01';
  let firstDay = new Date(
    new Date(date).getFullYear(),
    new Date(date).getMonth(),
    1
  );
  let lastDay = new Date(
    new Date(date).getFullYear(),
    new Date(date).getMonth() + 1
  );
  Income.find(
    {
      date: {
        $gte: firstDay,
        $lte: lastDay,
      },
      userId: req.user.id,
    },
    (err, incomes) => {
      Expense.find(
        {
          date: {
            $gte: firstDay,
            $lte: lastDay,
          },
          userId: req.user.id,
        },
        (err, expenses) => {
          if (err) return next(err);
          let sumOfExpenses = expenses.reduce(
            (acc, curr) => acc + Number(curr.amount),
            0
          );
          let sumOfIncomes = incomes.reduce(
            (acc, curr) => acc + Number(curr.amount),
            0
          );
          let balance = sumOfIncomes - sumOfExpenses;
          res.render('incomeExpenseStatement', {
            incomes,
            expenses,
            balance: balance,
            currentMonth: currentMonth,
          });
        }
      );
    }
  );
});

module.exports = router;