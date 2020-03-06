const _ = require("lodash");

const { IGNORED_IPS, RELEVANT_INDICATOR_SEARCH_RESULT_KEYS } = require("./constants");
const { _partitionFlatMap, getKeys } = require("./dataTransformations");

const getLookupResults = (entities, options, axiosWithDefaults, Logger) =>
  _partitionFlatMap(
    async (_entitiesPartition) => {
      const { ignoredIPs, entitiesPartition } = _.groupBy(
        _entitiesPartition,
        ({ isIP, value }) =>
          !isIP || (isIP && !IGNORED_IPS.has(value)) ? "entitiesPartition" : "ignoredIPs"
      );

      const results = await axiosWithDefaults({
        url: `${options.url}/incidents/search`,
        method: "post",
        headers: {
          authorization: options.apiKey,
          "Content-type": "application/json"
        },
        data: {
          filter: {
            name: entitiesPartition.map(({ value }) => value)
          }
        }
      })
        .then(_checkForInternalDemistoError)
        .catch((error) => {
          Logger.error({ error }, "Incident Query Error");
          throw error;
        });
      Logger.trace(
        {
          results,
          ignoredIPs,
          entitiesPartition
        },
        "FJSKJDLF"
      );
      const lookupResults = _.map(entitiesPartition, (entity) =>
        _.chain(results.data.data)
          .filter(({ name }) => name === entity.value)
          .thru((results) =>
            results && results.length
              ? {
                  entity,
                  data: {
                    summary: createSummary(results),
                    details: {
                      results: getKeys(RELEVANT_INDICATOR_SEARCH_RESULT_KEYS, results),
                      baseUrl: `${options.url}/#/Custom/caseinfoid/`
                    }
                  }
                }
              : { entity, data: null }
          )
          .value()
      );

      return lookupResults.concat(
        _.map(ignoredIPs, (entity) => ({ entity, data: null }))
      );
    },
    20,
    entities
  );

const _checkForInternalDemistoError = (response) => {
  const { error, detail } = response;
  if (error) {
    const internalDemistoError = Error("Internal Demisto Query Error");
    internalDemistoError.status = "internalDemistoError";
    internalDemistoError.description = `${error} -> ${detail}`;
    throw internalDemistoError;
  }
  return response;
};

const createSummary = (results) => {
  const result = results[0];
  const labels = result.labels.map(({ value }) => value);
  const summary = [
    ...labels,
    result.type,
    `Severity: ${result.severity}`,
    result.category
  ];
  
  return summary.filter(_.identity);
};

module.exports = {
  getLookupResults
};
