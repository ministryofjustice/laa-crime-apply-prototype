const _ = require('lodash');
const fetch = require('./data/fetch');
const schemaUrl = require('./data/form-settings').schemas.applications;

const utils = {
  constructDate: (date) => {
    if (!date) {
      return;
    }

    return date.year + '-' + date.month + '-' + date.day;
  },
  deconstructDate: (date) => {
    date = new Date(date);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    }
  },
  filterOffenceIds: (offenceIdList) => {
    let offenceIds = _.compact(offenceIdList?.filter(item => item != "_unchecked"));
    return offenceIds
  },
  formatDate: (date) => {
    if (!date) {
      return 'n/a';
    }

    const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    date = new Date(date);
    return date.getDate() + ' ' + month[date.getMonth()] + ' ' + date.getFullYear();
  },
  getFormattedDob: (req) => {
    let dob = req.session.data.dob || {};
    if (dob.day && dob.month && dob.year) {
      dob = utils.constructDate(req.session.data.dob);
      return utils.formatDate(dob);
    } else {
      return false;
    }
  },
  getFormattedDateStamp: (req) => {
    let dateStamp = new Date(req.session.data.date_stamp) || {};
    let date = `${dateStamp.getFullYear()}-${dateStamp.getMonth()+1}-${dateStamp.getDate()}`
    
    if (req.session.data.date_stamp) {
      let formattedDateStamp = utils.formatDate(date);
      let time
      if (dateStamp.getHours() > 12) {
        time = `${dateStamp.getHours()-12}:${dateStamp.getMinutes()}pm`
      } else {
        time = `${dateStamp.getHours()}:${dateStamp.getMinutes()}am`
      }
      return`${formattedDateStamp} ${time}`
    } else {
      return false;
    }
  },
  parseItemResponse: (response) => {
    if (response.Item) {
      return response.Item.data
    }
    return;
  },
  preprocessApplication: async (req) => {
    let schema = await fetch(schemaUrl);
    let schemaSections = _.keys(schema.properties);
    utils.setDateOfBirth(req);
    return _.pick(req.session.data, schemaSections);
  },
  setDateElements: (req) => {
    try {
      let dob = req.session.data['client_details']['client']['date_of_birth'];
      if (dob) {
        let date = utils.deconstructDate(dob);
        return date;
      } else {
        return req.session.data.dob;
      }
    } catch (err) {
      return;
    }
  },
  setDateOfBirth: (req) => {
    let dob = req.session.data.dob;
    if (dob) {
      _.set(req.session.data, 'client_details.client.date_of_birth', utils.constructDate(dob));
    }
  },
  setNamesAsDefendants: (req) => {
    let names = _.map(req.session.data.new_names, (person) => {
      if (_.isEmpty(person.first_name)) {
        return false;
      }

      return person.first_name + ' ' + person.last_name;
    });

    if (names) {
      _.set(req.session.data, 'case_details.co_defendant_names', _.compact(names));
    }

    delete req.session.data.new_names;

    return names;
  },
  statusLabels: {
    started: 'In progress',
    completed: 'Submitted',
    updated: 'Amended'
  },
  sidemenu: (req) => {
    req.session.data.dob = req.session.data.dob || utils.setDateElements(req);
    let dob = utils.getFormattedDob(req);
    let date_stamp = utils.getFormattedDateStamp(req);
    return {
      dob,
      first_name: _.get(req.session.data, 'client_details.client.first_name'),
      last_name: _.get(req.session.data, 'client_details.client.last_name'),
      date_stamp
    };
  },
  skipMeans: (req) => {
   req.session.data.capital = { 'checkpoint': 'completed' };
   req.session.data.check_means_answers = { 'checkpoint': 'completed' };
   req.session.data.check_means_result = { 'checkpoint': 'completed' };
   return;
  },
  dateStampApplicable: (req) => {
    let dateStampCaseTypes = ['summary_only', 'either_way', 'committal', 'appeal','appeal-with-changes']
    let setDateStamp = dateStampCaseTypes.includes(req.session.data['case_details']['case_type']) ? true : false
    if (setDateStamp && !req.session.data['date_stamp']) {
      req.session.data['date_stamp'] = new Date()
    }
    return setDateStamp
  }
};

module.exports = utils;
