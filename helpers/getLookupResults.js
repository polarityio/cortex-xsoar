const _ = require('lodash');
const Aigle = require('aigle');
const _P = Aigle.mixin(_);

const IGNORED_IPS = new Set(['127.0.0.1', '255.255.255.255', '0.0.0.0']);

const getLookupResults = (entities, options, axiosWithDefaults, Logger) =>
  _partitionFlatMap(
    async (_entitiesPartition) => {
      const entitiesPartition = _entitiesPartition.filter(
        ({ isIP, value }) => !isIP || (isIP && !IGNORED_IPS.has(value))
      );

      const results = await axiosWithDefaults
        .get(`${options.url}/incidents/search`, {
          method: 'POST',
          headers: {
            authorization: options.apiKey,
            'Content-Type': 'application/json'
          },
          body: {
            filters: {
              name: entitiesPartition.map(({ value }) => value)
            }
          }
        })
        .then(_checkForInternalDemistoError)
        .catch((error) => {
          Logger.error({ error }, 'Incident Query Error');
          throw error;
        });

      const lookupResults = entitiesPartition.map((entity) =>
        _.chian(results)
          .filter(({ data: name }) => name === entity.value)
          .thru((result) =>
            !result || !entity.isIP || (entity.isIP && !IGNORED_IPS.has(entity.value))
              ? { entity, data: null }
              : {
                  entity,
                  data: { details: JSON.stringify(result) }
                }
          )
      );

      return lookupResults;
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
