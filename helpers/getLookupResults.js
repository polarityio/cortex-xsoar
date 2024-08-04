const _ = require('lodash');

const { IGNORED_IPS } = require('./constants');

const { _partitionFlatMap } = require('./dataTransformations');
const getPlaybooksByEntityGroup = require('./getPlaybooksByEntityGroup');
const queryIncidents = require('./queryIncidents');
const queryIndicators = require('./queryIndicators');
const search = require('./search');
const {
  getPlaybookRunHistoryForIncidents
} = require('./getPlaybookRunHistoryForIncidents');
const { formatDemistoResults } = require('./formatDemistoResults');

const getLookupResults = (entities, options, requestWithDefaults, Logger) =>
  _partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } =
        _splitOutIgnoredIps(_entitiesPartition);

      const entityGroupsWithPlaybooks = await getPlaybooksByEntityGroup(
        entitiesPartition,
        options,
        requestWithDefaults,
        Logger
      );

      const searchResults = await search(entitiesPartition, options, requestWithDefaults);

      const incidentsWithPlaybookRunHistory = await getPlaybookRunHistoryForIncidents(
        searchResults.incidents,
        options,
        requestWithDefaults,
        Logger
      );

      const lookupResults = formatDemistoResults(
        entityGroupsWithPlaybooks,
        incidentsWithPlaybookRunHistory,
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
