const express = require('express')
const router = express.Router()
const _ = require('lodash')
const statusCheck = require('./data/form-status')

router.get('/tasklist', function (req, res) {
  res.render('tasklist', statusCheck(req));
});

router.get('/start_page', function (req, res) {
  delete req.session.data;
  res.render('start_page');
});

module.exports = router
