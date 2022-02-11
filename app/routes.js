const express = require('express')
const router = express.Router()
const _ = require('lodash')
const statusCheck = require('./data/form-status')

// Add your routes here - above the module.exports line
router.get('/tasklist', function (req, res) {
  res.render('tasklist', statusCheck(req));
});

module.exports = router
