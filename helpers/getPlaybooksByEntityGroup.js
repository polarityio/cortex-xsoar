const { PLAYBOOK_SEARCH_TERMS } = require('./constants');
const { checkForInternalDemistoError } = require('./handleError');

const { _P } = require('./dataTransformations');

const getPlaybooksByEntityGroup = (
  entitiesPartition,
  options,
  Logger,
  requestWithDefaults
) =>
  _P
    .chain(entitiesPartition)
    .groupBy(_getEntityType)
    .reduce(_getPlaybooksForEntityType(options, Logger, requestWithDefaults), {})
    .value();

const _getEntityType = ({ isIP, isHash, isDomain, isEmail }) =>
  isIP ? 'ip' : isHash ? 'hash' : isDomain ? 'domain' : isEmail && 'email';

const _getPlaybooksForEntityType = (options, Logger, requestWithDefaults) => async (
  agg,
  valueEntities,
  keyEntityType
) => {
  const {
    body: { playbooks }
  } = await requestWithDefaults({
    url: `${options.url}/playbook/search`,
    method: 'POST',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    },
    body: {
      query: PLAYBOOK_SEARCH_TERMS[keyEntityType]
    }
  })
    .then(checkForInternalDemistoError)
    .catch((error) => {
      Logger.error({ error }, 'Incident Query Error');
      throw error;
    });

  return {
    ...agg,
    [keyEntityType]: {
      entities: valueEntities,
      playbooks
    }
  };
};

module.exports = getPlaybooksByEntityGroup;