const { checkForInternalDemistoError } = require('./handleError');

const queryIncidents = async (options, entitiesPartition, Logger, axiosWithDefaults) => {
  const {
    data: { data: incidents }
  } = await axiosWithDefaults({
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
    .then(checkForInternalDemistoError)
    .catch((error) => {
      Logger.error({ error }, 'Incident Query Error');
      throw error;
    });
    
  return incidents;
};

module.exports = queryIncidents;
