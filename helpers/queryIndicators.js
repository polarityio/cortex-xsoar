const fp = require('lodash/fp');

const queryIndicators = async (
  entitiesPartition,
  options,
  requestWithDefaults,
  Logger
) => {
  const query = fp.flow(fp.map(fp.get('value')), fp.join(' OR '))(entitiesPartition);
  const {
    body: { iocObjects: indicators }
  } = await requestWithDefaults({
    url: `${options.url}/indicators/search`,
    method: 'POST',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    },
    body: { query }
  }).catch((error) => {
    Logger.error(error, 'Indicators Query Error');
    throw error;
  });

  return indicators;
};

module.exports = queryIndicators;
