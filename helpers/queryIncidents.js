const fp = require('lodash/fp');

const queryIncidents = async (
  entitiesPartition,
  options,
  requestWithDefaults,
  Logger
) => {
  const entityValues = fp.map(fp.get('value'), entitiesPartition);
  const {
    body: { data: incidents }
  } = await requestWithDefaults({
    url: `${options.url}/incidents/search`,
    method: 'POST',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    },
    body: {
      filter: {
        name: entityValues,
        labels: entityValues
      }
    }
  }).catch((error) => {
    Logger.error({ error }, 'Incident Query Error');
    throw error;
  });

  return incidents;
};

module.exports = queryIncidents;
