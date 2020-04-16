const { checkForInternalDemistoError } = require('./handleError');

const queryIncidents = async (options, entitiesPartition, Logger, requestWithDefaults) => {
  const entityValues = entitiesPartition.map(({ value }) => value);
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
  })
    .then(checkForInternalDemistoError)
    .catch((error) => {
      Logger.error({ error }, 'Incident Query Error');
      throw error;
    });
    
  return incidents;
};

module.exports = queryIncidents;
