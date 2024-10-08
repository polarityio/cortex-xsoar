const fp = require('lodash/fp');

const searchIndicatorTypes = async (
  { term, selectedIndicatorType },
  options,
  requestWithDefaults,
  callback,
  Logger
) => {
  try {
    const types = fp.flow(
      fp.getOr([], 'body'),
      searchByTerm(term, selectedIndicatorType),
      fp.sortBy('details'),
      fp.slice(0, 50)
    )(
      await requestWithDefaults({
        url: `${options.apiUrl}/${options.apiKeyId.length > 0 ? 'xsoar/' : ''}reputation`,
        method: 'GET',
        headers: { authorization: options.apiKey, 'x-xdr-auth-id': options.apiKeyId }
      })
    );

    callback(null, { types });
  } catch (error) {
    Logger.error(
      error,
      { detail: 'Failed to Get Indicator Types from Cortex XSOAR' },
      'Get Types Failed'
    );
    return callback({
      errors: [
        {
          err: error,
          detail: 'Cortex XSOAR Indicator Type Search Error - ' + error.message
        }
      ]
    });
  }
};

const searchByTerm = (term, selectedType) =>
  fp.filter(
    (indicatorType) =>
      fp.flow(
        fp.getOr('', 'details'),
        fp.toLower,
        fp.includes(fp.toLower(term))
      )(indicatorType) &&
      ((selectedType && selectedType.id !== indicatorType.id) || !selectedType)
  );

module.exports = searchIndicatorTypes;
