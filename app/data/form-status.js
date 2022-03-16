const _ = require('lodash');
const settings = require('./form-settings');
const validators = require('./validators');

class SectionStatus {
  constructor(section, data) {
    this.data = data || {};
    this.section = section;
    this.checkpoints = this.data.checkpoints || {};
    this.checkpoint = this.checkpoints[section];;
    this.getValues = (data) => data[this.section] || {};
    this.values = this.getValues(this.data);
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

    // check values 2 levels deep
    _.each(this.values, value => {
      if (!_.isEmpty(this.getValues(value))) {
        return true;
      }
    });

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

module.exports = (data) => {
  let progressCheck = _.mapValues(_.keyBy(settings.sections), (section) => {
    return new SectionStatus(section, data).status;
  });

  let dependencyCheck = checkDependencies(progressCheck);

  let statuses = _.mapValues(dependencyCheck, status => {
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
