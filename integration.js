'use strict';

const validateOptions = require('./helpers/validateOptions');
const createRequestWithDefaults = require('./helpers/createRequestWithDefaults');
const { setLogger } = require('./helpers/logger');
const { handleError } = require('./helpers/handleError');
const { getLookupResults } = require('./helpers/getLookupResults');
const createIndicator = require('./helpers/createIndicator');
const runPlaybook = require('./helpers/runPlaybook');
const searchIndicatorTypes = require('./helpers/searchIndicatorTypes');
const searchIncidentTypes = require('./helpers/searchIncidentTypes');
const writeToIncident = require('./helpers/writeToIncident');
const search = require('./helpers/search');

let Logger;
let requestWithDefaults;
const startup = (logger) => {
  Logger = logger;
  setLogger(logger);
  requestWithDefaults = createRequestWithDefaults(Logger);
};

const doLookup = async (entities, options, cb) => {
  Logger.debug({ entities }, 'Entities');
  options.url = options.url.endsWith('/') ? options.url.slice(0, -1) : options.url;

  let lookupResults;
  try {
    lookupResults = await getLookupResults(
      entities,
      options,
      requestWithDefaults,
      Logger
    );
  } catch (error) {
    Logger.error({ error }, 'Get Lookup Results Failed');
    return cb(handleError(error));
  }

  Logger.trace({ lookupResults }, 'Lookup Results');
  cb(null, lookupResults);
};

const onMessageFunctions = {
  runPlaybook,
  createIndicator,
  searchIndicatorTypes,
  searchIncidentTypes,
  writeToIncident
};

const onMessage = async (
  { action, data: actionParams },
  { url, ..._options },
  callback
) =>
  onMessageFunctions[action](
    actionParams,
    { ..._options, url: url.endsWith('/') ? url.slice(0, -1) : url },
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
