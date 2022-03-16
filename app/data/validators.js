const Ajv = require("ajv");
const URL = require("url").URL;
const _ = require('lodash');
const fetch = require('./fetch');
const settings = require('./form-settings');
const schemas = settings.schemas;

const getSchema = async (url) => {
  if(stringIsAValidUrl(url)) {
    let schema = await fetch(url);
    return schema;
  } else {
    return url;
  }
}

const stringIsAValidUrl = (s) => {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
};

let validators = _.mapValues(schemas, async (url) => {
  let schema = await getSchema(url);
  let ajv = new Ajv({ loadSchema: fetch, validateFormats: false });
  // for now, ignore dependentRequired (...bug in ajv/2019 breaks https lookups)
  ajv.addKeyword("dependentRequired");
  let validator = await ajv.compileAsync(schema);
  return validator;
});

// resolve promises
_.each(validators, (validator, id) => {
  validator.then(validate => {
    validators[id] = validate;
  });
});

module.exports = validators;
