const _ = require('lodash');

const { IGNORED_IPS } = require('./constants');

const { _partitionFlatMap } = require('./dataTransformations');
const getPlaybooksByEntityGroup = require('./getPlaybooksByEntityGroup');
const queryIncidents = require('./queryIncidents');
const queryIndicators = require('./queryIndicators');
const {
  getPlaybookRunHistoryForIncidents
} = require('./getPlaybookRunHistoryForIncidents');
const { formatDemistoResults } = require('./formatDemistoResults');

const getLookupResults = (entities, options, requestWithDefaults, Logger) =>
  _partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } = _splitOutIgnoredIps(
        _entitiesPartition
      );

      const entityGroupsWithPlaybooks = await getPlaybooksByEntityGroup(
        entitiesPartition,
        options,
        requestWithDefaults,
        Logger
      );

      const incidents = await queryIncidents(
        entitiesPartition,
        options,
        requestWithDefaults,
        Logger
      );

      const incidentsWithPlaybookRunHistory = await getPlaybookRunHistoryForIncidents(
        incidents,
        options,
        requestWithDefaults,
        Logger
      );

      const indicators = await queryIndicators(
        entitiesPartition,
        options,
        requestWithDefaults,
        Logger
      );

      const lookupResults = formatDemistoResults(
        entityGroupsWithPlaybooks,
        incidentsWithPlaybookRunHistory,
        indicators,
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
