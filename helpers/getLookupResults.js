const _ = require('lodash');

const { IGNORED_IPS } = require('./constants');

const { _partitionFlatMap } = require('./dataTransformations');
const getPlaybooksByEntityGroup = require('./getPlaybooksByEntityGroup');
const queryIncidents = require('./queryIncidents');
const {
  getPlaybookRunHistoryForIncidents
} = require('./getPlaybookRunHistoryForIncidents');
const { formatDomistoResults } = require('./formatDomistoResults');

const getLookupResults = (entities, options, axiosWithDefaults, Logger) =>
  _partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } = _splitOutIgnoredIps(
        _entitiesPartition
      );

      const entityGroupsWithPlaybooks = await getPlaybooksByEntityGroup(
        entitiesPartition,
        options,
        Logger,
        axiosWithDefaults
      );

      const incidents = await queryIncidents(
        options,
        entitiesPartition,
        Logger,
        axiosWithDefaults
      );

      const incidentsWithPlaybookRunHistory = await getPlaybookRunHistoryForIncidents(
        entitiesPartition,
        incidents,
        options,
        Logger,
        axiosWithDefaults
      );
      
      const lookupResults = formatDomistoResults(
        entityGroupsWithPlaybooks,
        incidentsWithPlaybookRunHistory,
        options
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
