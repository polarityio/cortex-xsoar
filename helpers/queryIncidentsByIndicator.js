const fp = require('lodash/fp');
const Aigle = require('aigle');

const queryIncidentsByIndicator = async (
  indicators,
  options,
  requestWithDefaults,
  Logger
) => {
  const incidentRequests = fp.flow(
    fp.flatMap(fp.get('investigationIDs')),
    fp.uniq,
    fp.filter((investigationID) => /^-?\d+$/.test(investigationID)),
    fp.map(
      (id) => async () =>
        fp.get(
          'body',
          await requestWithDefaults({
            url: `${options.url}/incident/load/${id}`,
            method: 'GET',
            headers: {
              authorization: options.apiKey,
              'Content-type': 'application/json'
            }
          })
        )
    )
  )(indicators);

  const incidents = fp.flatten(await Aigle.parallelLimit(incidentRequests, 10));

  return incidents || [];
};

module.exports = queryIncidentsByIndicator;
