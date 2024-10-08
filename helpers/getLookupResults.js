const _ = require('lodash');

const { IGNORED_IPS } = require('./constants');

const { _partitionFlatMap } = require('./dataTransformations');
const search = require('./search');
const { formatDemistoResults } = require('./formatDemistoResults');

const getLookupResults = (entities, options, requestWithDefaults, Logger) =>
  _partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } =
        _splitOutIgnoredIps(_entitiesPartition);

      const searchResults = await search(entitiesPartition, options, requestWithDefaults);

      Logger.trace({ searchResults }, 'Search Results');

      const lookupResults = formatDemistoResults(
        entities,
        searchResults.incidents,
        searchResults.indicators,
        searchResults.evidence,
        options,
        Logger
      );

      return lookupResults.concat(ignoredIpLookupResults);
    },
    20,
    entities
  );

const _splitOutIgnoredIps = (_entitiesPartition) => {
  const { ignoredIPs, entitiesPartition } = _.groupBy(
    _entitiesPartition,
    ({ isIP, value }) =>
      !isIP || (isIP && !IGNORED_IPS.has(value)) ? 'entitiesPartition' : 'ignoredIPs'
  );

  return {
    entitiesPartition,
    ignoredIpLookupResults: _.map(ignoredIPs, (entity) => ({ entity, data: null }))
  };
};

module.exports = {
  getLookupResults
};
