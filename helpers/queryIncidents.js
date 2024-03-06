const fp = require('lodash/fp');

const queryIncidents = async (
  entitiesPartition,
  options,
  requestWithDefaults,
  Logger
) => {
  const query = entitiesPartition.map((entity) => `"${entity.value}"`).join(' OR ');
  const requestOptions = {
    url: `${options.url}/incidents/search`,
    method: 'POST',
    json: true,
    headers: {
      authorization: options.apiKey
    },
    body: {
      filter: {
        query
      }
    }
  };
  Logger.debug({ requestOptions }, 'Incident Search Request Options');
  const {
    body: { data: incidents }
  } = await requestWithDefaults(requestOptions).catch((error) => {
    Logger.error(error, 'Incident Query Error');
    throw error;
  });

  return incidents;
};

module.exports = queryIncidents;
