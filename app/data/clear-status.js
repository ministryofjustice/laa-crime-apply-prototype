const _ = require('lodash');
const settings = require('./form-settings');


module.exports = (req) => {
  let formData = req.session.data;
  _.each(settings.sections, (section) => {
    delete req.session.data[section]
  })
};
