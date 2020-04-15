const { checkForInternalDemistoError } = require('./handleError');

const queryIncidents = async (options, entitiesPartition, Logger, requestWithDefaults) => {
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
        name: entitiesPartition.map(({ value }) => value)
      }
    }
  })
    .then(checkForInternalDemistoError)
    .catch((error) => {
      Logger.error({ error }, 'Incident Query Error');
      throw error;
    });
    
  return incidents;
};

module.exports = queryIncidents;
