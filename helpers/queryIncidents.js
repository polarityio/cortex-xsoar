const fp = require('lodash/fp');
const Aigle = require('aigle');

const queryIncidents = async (
  entitiesPartition,
  options,
  requestWithDefaults,
  Logger
) => {
  const entityValues = fp.map(fp.get('value'), entitiesPartition);

  const incidentRequests = fp.flow(
    fp.uniq,
    fp.map(
      (entityValue) => async () =>
        fp.get(
          'body.data',
          await requestWithDefaults({
            method: 'POST',
            url: `${options.url}/incidents/search`,
            headers: {
              authorization: options.apiKey,
              'Content-type': 'application/json'
            },
            body: {
              filter: {
                query: entityValue
              }
            }
          })
        )
    )
  )(entityValues);

  const incidents = fp.flatten(await Aigle.parallelLimit(incidentRequests, 10));

  return incidents || [];
};

module.exports = queryIncidents;
