const express = require('express')
const router = express.Router()
const _ = require('lodash')
const statusCheck = require('./data/form-status')
const fetch = require('./data/fetch')
const hmrc_record = require('./data/hmrc-record')
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

router.post('/case_details_confirm', function (req, res, next) {
  let origin = req.session.data['origin'];
  if (origin == 'case_details_urn') {
    delete req.session.data['origin'];
    return next();
  }

  let confirm = req.session.data['case_details_confirm'];
  if (confirm == "change") {
    res.redirect('/case_details');
  } else {
    res.redirect('/ioj');
  }
});

router.post('/ioj', function (req, res, next) {
  let origin = req.session.data['origin'];
  if (origin == 'ioj') {
    delete req.session.data['origin'];
    let passported = isPassported(req);

    if (JSON.parse(passported)) {
      req.session.data.income = { 'checkpoint': 'completed' };

      if (!isCrownCourt(req)) {
        skipMeans(req);
      }

      res.redirect('/application_cert_review');
    } else {
      res.redirect('/tasklist');
    }
  } else {
    return next();
  }
});

router.post('/hmrc_record', function (req, res, next) {
  let below_threshold = isBelowIncomeThreshold(req);
  if (below_threshold) {
    req.session.data['income']['checkpoint'] = 'completed';

    if (!isCrownCourt(req)) {
      skipMeans(req);
      res.redirect('/application_cert_review');
    } else {
      res.redirect('/outgoings');
    }

  } else {
    return next();
  }
});

router.post('/property', function (req, res, next) {
  if (!isCrownCourt(req)) {
    req.session.data['capital']['checkpoint'] = 'completed';
    res.redirect('/means_assessment_check_answers');
  } else {
    return next();
  }
});

router.get('/hmrc_record', function (req, res) {
  req.session.data['means_assessment']['income'] = hmrc_record;
  res.render('hmrc_record');
});

const isPassported = (req) => {
  try {
    return req.session.data['means_assessment']['benefits_status']['passported'];
  } catch (err) {
    return false;
  }
}

const isCrownCourt = (req) => {
  try {
    return req.session.data['case_details']['court_type'] == 'crown';
  } catch (err) {
    return false;
  }
}

const skipMeans = (req) => {
  req.session.data.capital = { 'checkpoint': 'completed' };
  req.session.data.check_means_answers = { 'checkpoint': 'completed' };
  req.session.data.check_means_result = { 'checkpoint': 'completed' };
  return;
}

const isBelowIncomeThreshold = (req) => {
  try {
    return req.session.data['means_assessment']['benefits_status']['below_income_threshold'] == 'yes';
  } catch (err) {
    return false;
  }
}

const parseApiResponse = (response) => {
  if (response.Item) {
    return response.Item.data
  }
  return;
}

module.exports = router
