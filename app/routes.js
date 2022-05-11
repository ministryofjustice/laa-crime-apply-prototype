const express = require('express');
const router = express.Router();
const _ = require('lodash');
const statusCheck = require('./data/form-status');
const fetch = require('./data/fetch');
const post = require('./data/post');
const validators = require('./data/validators');
const hmrc_record = require('./data/hmrc-record');
const passporting = require('./data/passporting');
const applicationsApiUrl = "https://n7ykjge71d.execute-api.eu-west-2.amazonaws.com/alpha/applications";
const offencesList = require('./data/offence_list');
const https = require('https');
const utils = require('./utils');

router.use((req, res, next) => {
  let mvpFlag = req.query?.mvp;
  if (mvpFlag) {
    req.session.mvp = mvpFlag == 'true';
  }
  next();
});

router.post('/account_number_answer', function (req, res) {
  let accountNumberCorrect = req.session.data['account-number-correct']
  if (accountNumberCorrect == "yes"){
    res.redirect('/dashboard')
  } else {
    res.redirect('/account_number_select')
  }
});

router.get('/tasklist/:id', async (req, res, next) => {
  try {
    let id = req.params && req.params.id;
    if (id) {
      let dataUrl = applicationsApiUrl + '/' + id;
      let response = await fetch(dataUrl);
      let data = utils.parseItemResponse(response);

      if (data) {
        req.session.data = _.assign(data, req.session.data);
      }
    }

    let status = statusCheck(req.session.data, validators);
    status.sidemenu = utils.sidemenu(req);

    res.render('tasklist', status);
  } catch (err) {
    return next(err);
  }
});

router.get('/tasklist', function (req, res) {
  let status = statusCheck(req.session.data, validators);
  status.sidemenu = utils.sidemenu(req);

  let iojStatus = _.get(status.sections, 'interests_of_justice.key');
  let passported = passporting.isPassported(req.session.data);
  status.date_stamp = (iojStatus == 'completed' && !passported) ? true : false;

  res.render('tasklist', status);
});

router.get('/dashboard', async (req, res, next) => {
  delete req.session.data;
  try {
    let response = await fetch(applicationsApiUrl);
    let data = response.Items || [];
    let applications = _.map(data, item => {
      return {
        name: item.data.client_details.client.first_name + ' ' + item.data.client_details.client.last_name,
        date: utils.formatDate(item.date),
        reference: 'LAA-' + item.id.substring(1, 7),
        status: item.status,
        id: item.id,
        timestamp: item.date || 0
      };
    });

    applications.sort(({timestamp:a}, {timestamp:b}) => b-a);
    applications = applications.slice(0, 20);

    res.render('dashboard', { applications });
  } catch (err) {
    return next(err);
  }
});

router.get('/start_page', function (req, res) {
  delete req.session.data;
  res.render('start_page');
});

router.post('/dwp_nonpassported', function (req, res) {
  let mvp = req.session.mvp;

  let isDwpCorrect = req.session.data['not-passported'];

  if (isDwpCorrect == "no") {
    res.redirect('/benefit_checker_confirm');
  } else {
    res.redirect('/tasklist');
  }
});

router.post('/dwp_passported', function (req, res, next) {
  let nonPassported = req.session.data['goto-non-passported'];
  if (nonPassported == 'yes') {
    res.redirect('/dwp_nonpassported');
  } else {
    return next();
  }
});

router.get('/dwp_passported', function (req, res) {
  _.set(req.session.data, 'means_assessment.benefits_status.passported', true);

  let mvp = req.session.mvp;
  let outOfScope = false;
  if (mvp) {
    let nino = _.get(req.session.data, 'client_details.client.national_insurance_number');
    let partner = _.get(req.session.data, 'client_details.partner.first_name');
    let hasPartner = !_.isEmpty(partner);
    if (_.isEmpty(nino) || hasPartner) {
      outOfScope = true;
    }
  }

  if (outOfScope) {
    res.redirect('/eforms_redirect');
  } else {
    res.render('dwp_passported', { mvp: mvp });
  }
});

router.get('/dwp_nonpassported', function (req, res) {
  let mvp = req.session.mvp;
  if (mvp) {
    res.redirect('/eforms_redirect');
  } else {
    _.set(req.session.data, 'means_assessment.benefits_status.passported', false);
    res.render('dwp_nonpassported');
  }
});

router.get('/ioj_passported', function (req, res) {
  let passported = passporting.isPassported(req.session.data);
  var route
  if (passported) {
    route = "/application_cert_review"
  } else {
    route = "/tasklist"
  }

  res.render('ioj_passported', { route: route });
});

router.get('/sign_in', function (req, res) {
   let injected_id = req.query && req.query.id;
   delete req.session.data;
   res.render('sign_in', { injected_id });
});

router.get('/laa_portal', function (req, res) {
   let injected_id = req.query && req.query.id;
   res.render('laa_portal', { injected_id });
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

router.get('/client_details_long', function (req, res) {
  let mvp = req.session.mvp;

  res.render('client_details_long', { mvp: mvp });
});

router.get('/case_details_confirm', function (req, res) {
  let passported = passporting.isPassported(req.session.data);

  res.render('case_details_confirm', { date_stamp: passported});
});

router.post('/case_details_confirm', function (req, res, next) {
  let origin = req.session.data['origin'];
  if (origin == 'case_details_urn') {
    delete req.session.data['origin'];
    req.session.data['case_details_type'] = 'urn';
    res.redirect('case_details_confirm')
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
    let passported = passporting.isPassported(req.session.data);

    if (passported) {
      req.session.data.income = { 'checkpoint': 'completed' };

      if (!passporting.isCrownCourt(req.session.data)) {
        utils.skipMeans(req);
      }

      res.redirect('/application_cert_review');
    } else {
      res.redirect('/tasklist');
    }
  } else {
    req.session.data['case_details_type'] = 'manual';
    let offences = []
    offenceIds = utils.filterOffenceIds(req.session.data.offence)

    offenceIds.forEach((offenceId, index) => {
      let year = req.session.data['offence-year'][index]
      let month = req.session.data['offence-month'][index]
      let day = req.session.data['offence-day'][index]
      if (offenceId) {
        offences.push(
          {
            offence: offencesList[offenceId].B,
            offence_class: offencesList[offenceId].D,
            offence_date: `${year}-${month}-${day}`
          })
      }
    })
    req.session.data['case_details']['offences'] = offences;

    let case_type = req.session.data['case_details']['case_type'];
    if (case_type.includes('trial') || case_type.includes('indictable')) {
      req.session.data['case_details']['court_type'] = 'crown';
    } else {
      req.session.data['case_details']['court_type'] = 'magistrates';
    }

    utils.setNamesAsDefendants(req);

    return next();
  }
});

router.post('/hmrc_record', function (req, res, next) {
  let below_threshold = passporting.isBelowIncomeThreshold(req.session.data);
  if (below_threshold) {
    req.session.data['income']['checkpoint'] = 'completed';

    if (!passporting.isCrownCourt(req.session.data)) {
      utils.skipMeans(req);
      res.redirect('/application_cert_review');
    } else {
      res.redirect('/outgoings');
    }

  } else {
    return next();
  }
});

router.post('/property', function (req, res, next) {
  if (!passporting.isCrownCourt(req.session.data)) {
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

router.get('/case_details', function (req, res) {
  let banner = req.query && req.query.banner;
  let case_details = req.session.data.case_details || {};
  let names = _.map(case_details.co_defendant_names, name => {
    return name.split(" ");
  });
  offenceIds = utils.filterOffenceIds(req.session.data.offence)

  res.render('case_details', { offencesList: offencesList, offenceIds: offenceIds, banner, names });
});

router.get('/case_details_offence', function (req, res) {
  let passported = passporting.isPassported(req.session.data);

  res.render('case_details_offence', { offences: offencesList, date_stamp: passported });
});

router.get('/application_cert_review', function (req, res) {
  let date = utils.constructDate(req.session.data.dob);
  res.render('application_cert_review', { date_of_birth: utils.formatDate(date) });
});

router.post('/confirm_the_following', async (req, res, next) => {
  if (!req.session.data.declaration) {
    return next();
  }

  delete req.session.data.declaration;

  try {
    let application = await utils.preprocessApplication(req);
    let validator = validators['applications'];
    if (!validator(application)) {
      console.log(validator.errors);
      throw 'Application failed validation';
    }

    let url = applicationsApiUrl + '/submit';
    let submit = await post(url, JSON.stringify(application));
    res.redirect('/equality_intro');
  } catch (err) {
    console.log(err);
    return next(err);
  }
});

router.get('/delete/:id', async (req, res, next) => {
  try {
    let id = req.params && req.params.id;
    let protectedApps = [
      '79fec2f7-2790-42a9-b092-b1308afa4a6c',
      'cc9faf9c-4a65-4383-8ec1-b08f6c65ac0c',
      '4ccd3e44-b534-48d9-8cee-8a4eada06a93'
    ];

    if (protectedApps.includes(id)) {
      res.redirect('/dashboard');
    } else {
      if (id) {
        let dataUrl = applicationsApiUrl + '/' + id;
        const options = { method: 'DELETE' };
        const req = https.request(dataUrl, options, (response) => {
          console.log('Status Code:', response.statusCode);
          res.redirect('/dashboard');
        }).on("error", (err) => {
          console.log("Error: ", err.message);
          throw err;
        });

        req.end();
      }
    }
  } catch (err) {
    console.log(err);
    return next(err);
  }
});

module.exports = router;
