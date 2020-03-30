const { PLAYBOOK_SEARCH_TERMS } = require('./constants');
const { checkForInternalDemistoError } = require('./handleError');

const { _P } = require('./dataTransformations');

const getPlaybooksByEntityGroup = (
  entitiesPartition,
  options,
  Logger,
  axiosWithDefaults
) =>
  _P
    .chain(entitiesPartition)
    .groupBy(_getEntityType)
    .reduce(_getPlaybooksForEntityType(options, Logger, axiosWithDefaults), {})
    .value();

const _getEntityType = ({ isIP, isHash, isDomain, isEmail }) =>
  isIP ? 'ip' : isHash ? 'hash' : isDomain ? 'domain' : isEmail && 'email';

const _getPlaybooksForEntityType = (options, Logger, axiosWithDefaults) => async (
  agg,
  valueEntities,
  keyEntityType
) => {
  const {
    data: { playbooks }
  } = await axiosWithDefaults({
    url: `${options.url}/playbook/search`,
    method: 'post',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    },
    data: {
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