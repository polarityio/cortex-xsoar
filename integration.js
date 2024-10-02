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

  // This is a v6 server so the apiUrl is just the normal app url
  options.apiUrl = options.apiUrl.length === 0 ? options.url : options.apiUrl;
  options.apiUrl = options.apiUrl.endsWith('/')
    ? options.apiUrl.slice(0, -1)
    : options.apiUrl;

  let lookupResults;
  try {
    lookupResults = await getLookupResults(
      entities,
      options,
      requestWithDefaults,
      Logger
    );
  } catch (error) {
    const handledError = handleError(error);
    Logger.error({ handledError }, 'Get Lookup Results Failed');
    return cb(handledError);
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
