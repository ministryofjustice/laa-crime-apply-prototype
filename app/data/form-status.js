const _ = require('lodash');
const settings = require('./form-settings');


module.exports = (req) => {
  let formData = req.session.data;

  const getSectionData = (key) => formData[key] || {};

  const getSectionStatus = (section) => {
    let dependencies = settings.dependencies[section];
    if (checkIfBlocked(dependencies)) { return 'blocked'; }
    return getLastActiveStatus(section);
  }

  const getLastActiveStatus = (section) => _.last(getSectionData(section)) || 'not_started';

  const checkIfBlocked = (dependencies) => _.find(dependencies, (key) => {
    let status = _.last(getSectionData(key)) || {};
    if (status == 'completed' || status == 'not_needed') { return false; }
    return true;
  });

  let sectionStatuses = _.mapValues(_.keyBy(settings.sections), (section) => {
    let status = getSectionStatus(section);
    return {
      label: settings.statuses[status],
      key: status
    }
  });

  return {
    sections: sectionStatuses,
    total: settings.sections.length || 0,
    completed: _.filter(sectionStatuses, (i) => i.key == 'completed' || i.key == 'not_needed').length || 0
  };
};
