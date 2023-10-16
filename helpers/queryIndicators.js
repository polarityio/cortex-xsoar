const fp = require('lodash/fp');
const { ALL_TEXT_FIELDS_TO_SEARCH } = require('./constants');

const queryIndicators = async (
  entitiesPartition,
  options,
  requestWithDefaults,
  Logger
) => {
  const query = fp.flow(fp.map(handleCustomTypes), fp.join(' OR '))(entitiesPartition);

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
    Logger.error({ error }, 'Indicators Query Error');
    throw error;
  });

  return indicators;
};

const handleCustomTypes = (entity) => {
  if (entity.types && entity.types.length === 1 && entity.types[0] === 'custom.allText') {
    return fp.flow(
      fp.map((field) => `${field}:${entity.value}`),
      fp.join(' OR ')
    )(ALL_TEXT_FIELDS_TO_SEARCH);
  }
  return fp.get('value', entity);
};

module.exports = queryIndicators;
