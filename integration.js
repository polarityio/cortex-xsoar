"use strict";

const NodeCache = require("node-cache");

const validateOptions = require("./helpers/validateOptions");
const createAxiosWithDefaults = require("./helpers/createAxiosWithDefaults");

const { TIME_FOR_TOKEN_DAYS } = require("./helpers/constants");
const handleError = require("./helpers/handleError");
const { getLookupResults } = require("./helpers/getLookupResults");

let Logger;
let axiosWithDefaults;
const tokenCache = new NodeCache({
  stdTTL: TIME_FOR_TOKEN_DAYS * 24 * 60 * 60 - 8000, //Token lasts Token length days
  checkperiod: 24 * 60 * 60 //Check if Expired once a day
});

function startup(logger) {
  Logger = logger;
  axiosWithDefaults = createAxiosWithDefaults(tokenCache, Logger);
}

const doLookup = async (entities, options, cb) => {
  Logger.debug({ entities }, "Entities");

  let lookupResults;
  try {
    lookupResults = await getLookupResults(entities[0], options, axiosWithDefaults, Logger);
  } catch (error) {
    Logger.error({ error }, "Get Lookup Results Failed");
    return cb(handleError(error));
  }

  Logger.trace({ lookupResults }, "Lookup Results");
  cb(null, lookupResults);
};

module.exports = {
  doLookup,
  startup,
  validateOptions
};
