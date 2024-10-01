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
    url: `${options.apiUrl}/${options.apiKeyId.length > 0 ? 'xsoar/public/v1/' : ''}indicators/search`,
    method: 'POST',
    headers: {
      authorization: options.apiKey,
      'x-xdr-auth-id': options.apiKeyId,
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
