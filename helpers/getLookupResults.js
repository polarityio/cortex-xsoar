const _ = require('lodash');
const Aigle = require('aigle');
const _P = Aigle.mixin(_);

const IGNORED_IPS = new Set(['127.0.0.1', '255.255.255.255', '0.0.0.0']);

const getLookupResults = (entities, options, axiosWithDefaults, Logger) =>
  _partitionFlatMap(
    async (_entitiesPartition) => {
      const { ignoredIPs, entitiesPartition } = _.groupBy(
        _entitiesPartition,
        ({ isIP, value }) =>
          !isIP || (isIP && !IGNORED_IPS.has(value)) ? 'entitiesPartition' : 'ignoredIPs'
      );
      
      const results = await axiosWithDefaults({
        url: `${options.url}/incidents/search`,
        method: 'post',
        headers: {
          authorization: options.apiKey,
          'Content-type': 'application/json'
        },
        data: {
          filter: {
            name: entitiesPartition.map(({ value }) => value)
          }
        }
      })
        .then(_checkForInternalDemistoError)
        .catch((error) => {
          Logger.error({ error }, 'Incident Query Error');
          throw error;
        });
        Logger.trace(
          {
            results,
            ignoredIPs,
            entitiesPartition
          },
          'FJSKJDLF'
        );
      const lookupResults = _.map(entitiesPartition, (entity) =>
        _.chain(results.data.data)
          .filter(({ name }) => name === entity.value)
          .thru((results) =>
            results && results.length || Logger.trace({ results }, "LKJSAKLFSJF")
              ? {
                  entity,
                  data: { summary: [], details: JSON.stringify(results) }
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
    const internalDemistoError = Error('Internal Demisto Query Error');
    internalDemistoError.status = 'internalDemistoError';
    internalDemistoError.description = `${error} -> ${detail}`;
    throw internalDemistoError;
  }
  return response;
};

const _partitionFlatMap = (func, partitionSize, collection, parallelLimit = 10) =>
  _P
    .chain(collection)
    .chunk(partitionSize)
    .map((x) => async () => func(x))
    .thru((x) => Aigle.parallelLimit(x, parallelLimit))
    .flatten()
    .value();

module.exports = {
  getLookupResults
};
