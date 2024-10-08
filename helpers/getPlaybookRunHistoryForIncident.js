const _ = require('lodash');
const moment = require('moment');

const getPlaybookRunHistoryForIncident = async (
  { incidentId },
  options,
  requestWithDefaults,
  callback,
  Logger
) => {
  try {
    const playbookRunHistory = await getPlaybookRunHistory(
      incidentId,
      options,
      Logger,
      requestWithDefaults
    );

    const pbHistoryWithFormattedDates = formatPlaybookRunHistory(playbookRunHistory);

    Logger.trace(
      { pbHistoryWithFormattedDates, incidentId },
      'getPlaybookRunHistoryForIncident'
    );

    callback(null, {
      pbHistory: pbHistoryWithFormattedDates
    });
  } catch (error) {
    Logger.error(
      error,
      { detail: `Failed to Get Playbook Run History for Incident ${incidentId}` },
      'Get Playbooks Failed'
    );
    return callback({
      errors: [
        {
          err: error,
          detail:
            'Cortex XSOAR Failed to get Playbook Run History for Incident - ' +
            error.message
        }
      ]
    });
  }
};

const getPlaybookRunHistory = async (
  incidentId,
  options,
  Logger,
  requestWithDefaults
) => {
  const { body: playbookRunHistory } = await requestWithDefaults({
    url: `${options.apiUrl}/${
      options.apiKeyId.length > 0 ? 'xsoar/' : ''
    }inv-playbook/${incidentId}`,
    method: 'GET',
    headers: {
      authorization: options.apiKey,
      'x-xdr-auth-id': options.apiKeyId,
      'Content-type': 'application/json'
    }
  });

  return playbookRunHistory;
};

const formatPlaybookRunHistory = ({
  pbHistory,
  name: currentPlaybookName,
  startDate: currentPlaybookStartDate,
  state: currentPlaybookStatus
}) =>
  _.chain(pbHistory)
    .thru((playbookRuns) =>
      (playbookRuns || []).concat({
        name: currentPlaybookName,
        date: currentPlaybookStartDate,
        status: currentPlaybookStatus
      })
    )
    .orderBy([({ startDate }) => moment(startDate).unix()], ['desc'])
    .value();

module.exports = { getPlaybookRunHistoryForIncident, formatPlaybookRunHistory };
