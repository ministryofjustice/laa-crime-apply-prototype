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
const courtsList = require('./data/court_list');
const https = require('https');
const utils = require('./utils');

router.use((req, res, next) => {
  let mvpFlag = req.query?.mvp;
  if (mvpFlag) {
    req.session.mvp = mvpFlag == 'true';
  }
  next();
});

router.post('/tasklist', function (req, res) {
  let mvpFlag = req.session.mvp
  let hasPartner = req.session.data['partner']

  if (mvpFlag) {
    if (hasPartner === 'yes') {
      res.redirect('/eforms_redirect');
    } else {
      res.redirect('/tasklist')
    }
  } else {
    res.redirect('/tasklist');
  }
});

router.get('/client_details_postcode_finder', function(req, res) {
  _.unset(req.session.data, 'postcode')
  _.unset(req.session.data, 'address-select')

  res.render('client_details_postcode_finder');
});

router.post('/client_details_urn', function(req, res) {
  if (req.session.data['address-select-correspondence']) {
    let houseNumber = Array.from(req.session.data['address-select-correspondence'])[0]
    _.set(req.session.data, 'correspondence-house-number', houseNumber)
  }

  let address = req.session.data['address-select']
  if (address !== '5 addresses found') {
    res.render('case_details_urn');
  } else {
    res.redirect('client_details_postcode_select_correspondence')
  }
});

router.post('/account_number', function (req, res) {
  let partner = req.session.data['partner']
  if (partner == "yes"){
    res.redirect('/eforms_redirect')
  } else {
    res.redirect('/account_number')
  }
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

    let status = statusCheck(req.session, validators);
    status.sidemenu = utils.sidemenu(req);

    res.render('tasklist', status);
  } catch (err) {
    return next(err);
  }
});

router.get('/tasklist', function (req, res) {
  let status = statusCheck(req.session, validators);
  status.sidemenu = utils.sidemenu(req);

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
  let isDwpCorrect = req.session.data['not-passported'];
  let mvp = req.session.mvp;

  if (isDwpCorrect == "no") {
    res.redirect('/benefit_checker_confirm');
  } else {
    if (mvp) {
      res.redirect('/eforms_redirect')
    } else {
      res.redirect('/tasklist');
    }
  }
});

router.post('/dwp_passported', function (req, res, next) {
  let nonPassported = req.session.data['goto-non-passported'];

  if (nonPassported == 'yes') {
    res.redirect('/dwp_nonpassported');
  } else {
    let hasNino = req.session.data['client_details']['nino_provided']

    if(hasNino == 'yes') {
      res.redirect('/dwp_passported');
    } else {
      res.redirect('/eforms_redirect');
    }
  }
});

router.post('/client_details_nino', function (req, res, next) {
  let dob_day = req.session.data['dob']['day']
  let dob_month = req.session.data['dob']['month']
  let dob_year = req.session.data['dob']['year']
  let dob = new Date(dob_year, dob_month, dob_day);

  let eighteenYearsAgo = new Date()
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

  if (dob < eighteenYearsAgo) {
    res.redirect('/client_details_nino');
  } else {
    res.redirect('/client_details_postcode_finder');
  }

});

router.get('/dwp_passported', function (req, res, next) {
  _.set(req.session.data, 'means_assessment.benefits_status.passported', true);

  let mvp = req.session.mvp;

  let outOfScope = false;
  if (mvp) {
    let nino = _.get(req.session.data, 'client_details.nino');

    if (_.isEmpty(nino)) {
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
    _.set(req.session.data, 'means_assessment.benefits_status.passported', false);
    res.render('dwp_nonpassported');
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
  let mvp = req.session.mvp;

  if (clientDetailsCorrect == "no") {
    res.redirect('/client_details');
  } else {
    if (mvp) {
      res.redirect('/dwp_passported');
    } else {
      res.redirect('/benefit_checker_select');
    }
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

router.get('/client_details', function (req, res) {
  let mvp = req.session.mvp;

  res.render('client_details', { mvp: mvp });
});

router.get('/case_details_confirm', function (req, res) {
  let showDateStamp = utils.dateStampApplicable(req)

  res.render('case_details_confirm', {showDateStamp});
});

router.get('/client_details_manual_address_correspondence', function (req, res) {
  _.set(req.session.data, 'origin', '/client_details_manual_address_correspondence')

  res.render('client_details_manual_address_correspondence');
});

router.post('/case_details_urn', function (req, res, next) {
  if (req.session.data['address-select']) {
    let houseNumber = Array.from(req.session.data['address-select'])[0]
    _.set(req.session.data, 'address-house-number', houseNumber)
  }
  let origin = _.get(req.session.data, 'origin');
  let addressType = req.session.data['correspondence_address_type'];
  let homeAddress = req.session.data['postcode']
  if (addressType == 'correspondence-address-other' && origin != '/client_details_manual_address_correspondence') {
    res.redirect('client_details_postcode_finder_correspondence')
  } else if (addressType == 'home-address' && !homeAddress) {
    res.redirect('client_details_postcode_finder')
  } else {
    delete req.session.data['origin'];
    res.redirect('case_details_urn')
  }
});

router.post('/client_details_postcode_select_correspondence', function (req, res, next) {
  res.redirect('client_details_postcode_select_correspondence')
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
    res.redirect('/case_details_case_type');
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

    let dates = utils.combineDateComponents(req.session.data)

    let offencesWithDates =  utils.pairOffencesWithDates(dates, req.session.data)

    req.session.data['case_details']['offences'] = offencesWithDates.flat();

    let case_type = req.session.data['case_details']['case_type'] || [];
    if (case_type.includes('trial') || case_type.includes('indictable')) {
      req.session.data['case_details']['court_type'] = 'crown';
    } else {
      req.session.data['case_details']['court_type'] = 'magistrates';
    }

    utils.setNamesAsDefendants(req);

    let dob = utils.constructDate(req.session.data.dob);
    _.set(req.session.data, 'client_details.client.dob', utils.formatDate(dob));

    let next_hearing_string = `${req.session.data['next-hearing-year']}-${req.session.data['next-hearing-month']}-${req.session.data['next-hearing-day']}`
    req.session.data['case_details']['next_hearing'] = utils.formatDate(next_hearing_string);

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

router.get('/case_details_offence_date', function (req, res) {
  utils.constructOffences(req)
  res.render('case_details_offence_date');
});

router.get('/case_details_case_type', function (req, res) {
  let banner = req.query && req.query.banner;

  res.render('case_details_case_type', { banner });
});

router.get('/case_details_hearing', function (req, res) {
  res.render('case_details_hearing', { courts: courtsList } );
});

router.post('/case_details_codefendants_details', function (req, res) {
  let hasCoDef = req.session.data['co_defendants']
  let urnProvided = req.session.data['case_details']['urn_provided']
  if (hasCoDef === 'yes') {
    res.redirect('case_details_codefendants_details')
  } else if (hasCoDef === 'no' && urnProvided === 'no') {
    res.redirect('case_details_hearing')
  } else {
    res.redirect('ioj')
  }
});


router.get('/case_details_codefendants', function (req, res) {
  res.render('case_details_codefendants');
});

router.get('/case_details_offence', function (req, res) {
  let showDateStamp = utils.dateStampApplicable(req)

  res.render('case_details_offence', { offences: offencesList, showDateStamp});
});

router.get('/application_cert_review', function (req, res) {
  res.render('application_cert_review');
});

router.get('/application_certificate/:id', async (req, res, next) => {
  try {
    let id = req.params && req.params.id;

    if (id) {
      let dataUrl = applicationsApiUrl + '/' + id;
      let response = await fetch(dataUrl);
      let data = utils.parseItemResponse(response);

      if (data) {
        req.session.data = data
      }
    }

    let details = utils.sidemenu(req);

    res.render('application_certificate', details);
  } catch (err) {
    return next(err);
  }
});

router.get('/application_certificate', function (req, res) {
  let details = utils.sidemenu(req);

  res.render('application_certificate', details)
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

router.get('/confirm_delete', function (req, res) {
  let id = req.query && req.query.id;
  let name = req.query && req.query.name;
  let reference = req.query && req.query.reference;

  res.render('confirm_delete', {id, name, reference})
});

router.get('/delete/:id', async (req, res, next) => {
  try {
    let id = req.params && req.params.id;
    let protectedApps = [
      '79fec2f7-2790-42a9-b092-b1308afa4a6c',
      'cc9faf9c-4a65-4383-8ec1-b08f6c65ac0c',
      'ee712003-ffc9-477d-8340-1bfbb5a2e3fb',
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
