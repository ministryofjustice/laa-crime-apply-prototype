const _ = require('lodash');
const settings = require('./form-settings');
const validators = require('./validators');
const passporting = require('./passporting');

class SectionStatus {
  constructor(section, data) {
    this.data = data || {};
    this.section = section;
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
    let validator = validators[this.section];
    if (!validator) {
      return false;
    }

    if (validator(this.values)) {
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

const checkDependencies = (sections) => {
  return _.mapValues(sections, (status, id) => {
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
      sections[id] = 'completed';
    }
  });

  return sections;
}

const progressCheck = (data) => {
  return _.mapValues(_.keyBy(settings.sections), (section) => {
    return new SectionStatus(section, data).status;
  });
}

module.exports = (data) => {
  let sections = progressCheck(data);
  sections = checkDependencies(sections);
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
