const _ = require('lodash');
const fp = require('lodash/fp');
const moment = require('moment');

const Aigle = require('aigle');

const getPlaybookRunHistoryForIncidents = async (
  incidents,
  options,
  requestWithDefaults,
  Logger
) => {
  const playbookRunHistoryRequests = fp.map(
    (incident) => async () => {
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
    },
    incidents
  );

  const incidentsWithPlaybookRunHistory = fp.flatten(
    await Aigle.parallelLimit(playbookRunHistoryRequests, 10)
  );

  return incidentsWithPlaybookRunHistory;
};

const getPlaybookRunHistory = async (incident, options, Logger, requestWithDefaults) => {
  const { body: playbookRunHistory } = await requestWithDefaults({
    url: `${options.url}/inv-playbook/${incident.id}`,
    method: 'GET',
    headers: {
      authorization: options.apiKey,
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
        date: moment(currentPlaybookStartDate).format('MMM D YY, h:mm A'),
        status: currentPlaybookStatus
      })
    )
    .orderBy([({ startDate }) => moment(startDate).unix()], ['desc'])
    .map(({ startDate, ...playbookRun }) => ({
      ...playbookRun,
      date: moment(startDate).format('MMM D YY, h:mm A')
    }))
    .value();

module.exports = { getPlaybookRunHistoryForIncidents, formatPlaybookRunHistory };
