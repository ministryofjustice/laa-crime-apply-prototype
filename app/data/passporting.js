const _ = require('lodash');
const settings = require('./form-settings');

const isPassported = (data) => {
  try {
    return JSON.parse(data['means_assessment']['benefits_status']['passported']);
  } catch (err) {
    return false;
  }
};

const isCrownCourt = (data) => {
  try {
    return data['case_details']['court_type'] == 'crown';
  } catch (err) {
    return false;
  }
};

const isBelowIncomeThreshold = (data) => {
  try {
    return data['means_assessment']['benefits_status']['below_income_threshold'] == 'yes';
  } catch (err) {
    return false;
  }
}

module.exports = {
  isPassported,
  isCrownCourt,
  isBelowIncomeThreshold,

  passport: (section, data) => {
    if (!isPassported(data)) {
      return false;
    }

    let means = ['income','capital','check_means_answers','check_means_result', 'evidence'];
    if (!isCrownCourt(data)) {
      means.push('capital');
    }

    if(_.includes(means, section)) {
      return true;
    }

    return false;
  },
}
