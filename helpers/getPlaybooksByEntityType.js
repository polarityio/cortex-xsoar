const { PLAYBOOK_SEARCH_TERMS } = require('./constants');
const fp = require('lodash/fp');

const _getEntityType = ({ isIP, isHash, isDomain, isEmail }) =>
  isIP ? 'ip' : isHash ? 'hash' : isDomain ? 'domain' : isEmail && 'email';

const getPlaybooksByEntityType = async (
  { entity },
  options,
  requestWithDefaults,
  callback,
  Logger
) => {
  const entityType = _getEntityType(entity);

  const requestOptions = {
    url: `${options.apiUrl}/${
      options.apiKeyId.length > 0 ? 'xsoar/public/v1/' : ''
    }playbook/search`,
    method: 'POST',
    headers: {
      authorization: options.apiKey,
      'x-xdr-auth-id': options.apiKeyId,
      'Content-type': 'application/json'
    },
    body: {
      query: PLAYBOOK_SEARCH_TERMS[entityType]
    }
  };

  try {
    const {
      body: { playbooks }
    } = await requestWithDefaults(requestOptions);

    const visiblePlaybooks = fp.filter((playbook) => !playbook.hidden, playbooks);

    Logger.trace({ playbooks: visiblePlaybooks }, 'Get Playbooks by Entity Type');

    callback(null, {
      playbooks: visiblePlaybooks
    });
  } catch (error) {
    Logger.error(
      error,
      { detail: `Failed to Get Playbooks for Entity Type ${entityType}` },
      'Get Playbooks Failed'
    );
    return callback({
      errors: [
        {
          err: error,
          detail: 'Cortex XSOAR Failed to get Playbooks by Entity Type - ' + error.message
        }
      ]
    });
  }
};

module.exports = getPlaybooksByEntityType;
