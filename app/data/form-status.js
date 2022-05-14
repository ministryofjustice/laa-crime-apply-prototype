const _ = require('lodash');
const settings = require('./form-settings');
const passporting = require('./passporting');

class SectionStatus {
  constructor(section, session, validator) {
    this.data = session.data || {};
    this.section = section;
    this.validator = validator;
    this.values = this.getValues();
    this.checkpoint = this.values.checkpoint;
    this.status = this.getStatus();
  }

  getStatus() {
    if (!this.isStarted()) {
      return 'not_started';
    }

    if (!this.isComplete()) {
      return 'in_progress';
    }

    return 'completed';
  }

  isStarted() {
    if (!_.isEmpty(this.values)) {
      return true;
    }

    return false;
  }

  isComplete() {
    // manual checkpoint flags
    if (this.checkpoint) {
      return true;
    }

    // values vs strict schema
    if (this.isValid()) {
      return true;
    }

    return false;
  }

  isValid() {
    if (!this.validator) {
      return false;
    }

    if (this.validator(this.values)) {
      return true;
    }

    return false;
  }

  getValues() {
    let values = this.data[this.section];
    if (values) {
      return values;
    }

    // check values 2 levels deep
    let match = _.find(this.data, this.section);

    if (match) {
      return match[this.section];
    }

    return {};
  }
}

const checkDependencies = (data, sections) => {
  let isPassported = passporting.isPassported(data.data);
  let isMvp = data.mvp

  return _.mapValues(sections, (status, id) => {
    if (isMvp || isPassported) {settings.dependencies["evidence"] = ["mvp"]}

    let dependencies = settings.dependencies[id] || [];
    if (isBlocked(dependencies, sections)) {
      return 'blocked';
    }

    return status;
  });
};

const isBlocked = (dependencies, sections) => {
  return _.find(dependencies, (key) => {
    let status = sections[key] || {};
    if (status == 'completed' || status == 'not_needed') {
      return false;
    }

    return true;
  });
}

const checkPassporting = (data, sections) => {
  _.each(sections, (status, id) => {
    if (passporting.passport(id, data)) {
      sections[id] = 'not_applicable';
    }
    if (passporting.passport(id, data) && id == 'check_means_result') {
      sections[id] = 'eligible';
    }
  });

  return sections;
}

const progressCheck = (data, validators) => {
  return _.mapValues(_.keyBy(settings.sections), (section) => {
    let validator = validators[section];
    return new SectionStatus(section, data, validator).status;
  });
}

module.exports = (data, validators) => {
  let sections = progressCheck(data, validators);
  sections = checkDependencies(data, sections);
  sections = checkPassporting(data, sections);
  let statuses = _.mapValues(sections, status => {
    return {
      label: settings.statuses[status],
      key: status
    };
  })

  return {
    sections: statuses,
    total: settings.sections.length || 0,
    completed: _.filter(statuses, (i) => i.key == 'completed' || i.key == 'not_needed').length || 0
  };
};
