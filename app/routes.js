const express = require('express')
const router = express.Router()
const _ = require('lodash')
const statusCheck = require('./data/form-status')
const fetch = require('./data/fetch')
const applicationsApiUrl = "https://n7ykjge71d.execute-api.eu-west-2.amazonaws.com/alpha/applications";

router.get('/tasklist/:id', async (req, res, next) => {
  try {
    let id = req.params && req.params.id;
    if (id) {
      let dataUrl = applicationsApiUrl + '/' + id;
      let response = await fetch(dataUrl);
      let data = parseApiResponse(response);

      if (data) {
        req.session.data = _.assign(data, req.session.data);
      }
    }
    res.render('tasklist', statusCheck(req.session.data));
  } catch (err) {
    return next(err);
  }
});

router.get('/tasklist', function (req, res) {
  res.render('tasklist', statusCheck(req.session.data));
});

router.get('/start_page', function (req, res) {
  delete req.session.data;
  res.render('start_page');
});

router.post('/dwp_nonpassported', function (req, res) {
  let isDwpCorrect = req.session.data['not-passported'];

  if (isDwpCorrect == "no") {
    res.redirect('/benefit_checker_confirm');
  } else {
    res.redirect('/case_details_urn');
  }
});

router.post('/benefit_checker_confirm', function (req, res) {
  let clientDetailsCorrect = req.session.data['client-details-correct'];

  if (clientDetailsCorrect == "no") {
    res.redirect('/client_details_long');
  } else {
    res.redirect('/benefit_checker_select');
  }
});

router.post('/benefit_checker_select', function (req, res) {
  let benefits = req.session.data['passporting-benefit'];
  if (benefits == "none") {
    req.session.data['means_assessment']['benefits_status']['passported'] = false;
    res.redirect('/case_details_urn');
  } else {
    req.session.data['means_assessment']['benefits_status']['passported'] = true;
    res.redirect('/benefit_checker_evidence');
  }
});

const parseApiResponse = (response) => {
  if (response.Item) {
    return response.Item.data
  }
  return;
}

module.exports = router
