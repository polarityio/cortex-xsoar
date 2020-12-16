const fp = require('lodash/fp');

const searchTypes = async (
  { term, selectedType },
  options,
  requestWithDefaults,
  callback,
  Logger
) => {
  try {
    const types = fp.flow(
      fp.getOr([], 'body'),
      searchByTerm(term, selectedType),
      fp.sortBy('name'),
      fp.slice(0, 50)
    )(
      await requestWithDefaults({
        url: `${options.url}/incidenttype`,
        method: 'GET',
        headers: { authorization: options.apiKey }
      })
    );

    callback(null, { types });
  } catch (error) {
    Logger.error(
      error,
      { detail: 'Failed to Get Types from Cortex XSOAR' },
      'Get Types Failed'
    );
    return callback({
      errors: [
        {
          err: error,
          detail: 'Cortex XSOAR Type Search Error - ' + error.message
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
  
module.exports = searchTypes;
