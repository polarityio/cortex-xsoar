const fp = require('lodash/fp');

const searchIncidentTypes = async (
  { term, selectedIncidentType },
  options,
  requestWithDefaults,
  callback,
  Logger
) => {
  try {
    const types = fp.flow(
      fp.getOr([], 'body'),
      searchByTerm(term, selectedIncidentType),
      fp.sortBy('name'),
      fp.slice(0, 50)
    )(
      await requestWithDefaults({
        url: `${options.apiUrl}/${options.apiKeyId.length > 0 ? 'xsoar/' : ''}incidenttype`,
        method: 'GET',
        headers: { authorization: options.apiKey, 'x-xdr-auth-id': options.apiKeyId }
      })
    );

    callback(null, { types });
  } catch (error) {
    Logger.error(
      error,
      { detail: 'Failed to Get Incident Types from Cortex XSOAR' },
      'Get Types Failed'
    );
    return callback({
      errors: [
        {
          err: error,
          detail: 'Cortex XSOAR Incident Type Search Error - ' + error.message
        }
      ]
    });
  }
};

const searchByTerm = (term, selectedType) =>
  fp.filter(
    (incidentType) =>
      fp.flow(
        fp.getOr('', 'name'),
        fp.toLower,
        fp.includes(fp.toLower(term))
      )(incidentType) &&
      ((selectedType && selectedType.id !== incidentType.id) || !selectedType)
  );

module.exports = searchIncidentTypes;
