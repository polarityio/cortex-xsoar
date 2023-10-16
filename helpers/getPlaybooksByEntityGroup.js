const { PLAYBOOK_SEARCH_TERMS } = require('./constants');
const fp = require('lodash/fp');
const { _P } = require('./dataTransformations');

const getPlaybooksByEntityGroup = (
  entitiesPartition,
  options,
  requestWithDefaults,
  Logger
) =>
  _P
    .chain(entitiesPartition)
    .groupBy(_getEntityType)
    .reduce(_getPlaybooksForEntityType(options, Logger, requestWithDefaults), {})
    .value();

const _getEntityType = ({ isIP, isHash, isDomain, isEmail, isAllText }) =>
  isIP
    ? 'ip'
    : isHash
    ? 'hash'
    : isDomain
    ? 'domain'
    : isEmail
    ? 'email'
    : isAllText
    ? 'allText'
    : 'other';

const _getPlaybooksForEntityType =
  (options, Logger, requestWithDefaults) => async (agg, valueEntities, keyEntityType) => {
    let assembledQuery;

    if (keyEntityType === 'other') {
      assembledQuery = fp.flow(
        fp.map((entityType) => `${entityType}`),
        fp.join(' OR ')
      )(PLAYBOOK_SEARCH_TERMS);
    } else {
      assembledQuery = PLAYBOOK_SEARCH_TERMS[keyEntityType];
    }

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
        query: assembledQuery
      }
    }).catch((error) => {
      Logger.error({ error }, 'Incident Query Error');
      throw error;
    });

    return {
      ...agg,
      [keyEntityType]: {
        entities: valueEntities,
        playbooks: fp.filter((playbook) => !playbook.hidden, playbooks)
      }
    };
  };

module.exports = getPlaybooksByEntityGroup;
