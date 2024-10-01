const _ = require('lodash');
const moment = require('moment');

const { _P } = require('./dataTransformations');

const getPlaybookRunHistoryForIncidents = (
  incidents,
  options,
  requestWithDefaults,
  Logger
) =>
  _P.map(incidents, async (incident) => {
    const playbookRunHistory = await getPlaybookRunHistory(
      incident,
      options,
      Logger,
      requestWithDefaults
    );

    const pbHistoryWithFormattedDates = formatPlaybookRunHistory(playbookRunHistory);

    return {
      ...incident,
      pbHistory: pbHistoryWithFormattedDates
    };
  });

const getPlaybookRunHistory = async (incident, options, Logger, requestWithDefaults) => {
  const { body: playbookRunHistory } = await requestWithDefaults({
    url: `${options.url}/${options.apiKeyId.length > 0 ? 'xsoar/' : ''}inv-playbook/${incident.id}`,
    method: 'GET',
    headers: {
      authorization: options.apiKey,
      'x-xdr-auth-id': options.apiKeyId,
      'Content-type': 'application/json'
    }
  }).catch((error) => {
    Logger.error({ error }, 'Incident Query Error');
    throw error;
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

module.exports = { getPlaybookRunHistoryForIncidents, formatPlaybookRunHistory };
