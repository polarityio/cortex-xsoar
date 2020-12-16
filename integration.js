'use strict';

const validateOptions = require('./helpers/validateOptions');
const createRequestWithDefaults = require('./helpers/createRequestWithDefaults');

const { handleError } = require('./helpers/handleError');
const { getLookupResults } = require('./helpers/getLookupResults');
const runPlaybook = require('./helpers/runPlaybook');
const searchTypes = require('./helpers/searchTypes');

let Logger;
let requestWithDefaults;
const startup = (logger) => {
  Logger = logger;
  requestWithDefaults = createRequestWithDefaults(Logger);
};

const doLookup = async (entities, { url, ..._options }, cb) => {
  Logger.debug({ entities }, 'Entities');
  const options = { ..._options, url: url.endsWith('/') ? url.slice(0, -1) : url };

  let lookupResults;
  try {
    lookupResults = await getLookupResults(entities, options, requestWithDefaults, Logger);
  } catch (error) {
    Logger.error({ error }, 'Get Lookup Results Failed');
    return cb(handleError(error));
  }

  Logger.trace({ lookupResults }, 'Lookup Results');
  cb(null, lookupResults);
};

const onMessageFunctions = { runPlaybook, searchTypes };

const onMessage = async (
  { action, data: actionParams },
  options,
  callback
) =>
  onMessageFunctions[action](
    actionParams,
    options,
    requestWithDefaults,
    callback,
    Logger
  );


module.exports = {
  doLookup,
  startup,
  validateOptions,
  onMessage
};
