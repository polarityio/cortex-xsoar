const _ = require('lodash');
const moment = require('moment');

const { _P } = require('./dataTransformations');
const { checkForInternalDemistoError } = require('./handleError');

const getPlaybookRunHistoryForIncidents = (
  incidents,
  options,
  Logger,
  requestWithDefaults
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

const getPlaybookRunHistory = async (
  incident,
  options,
  Logger,
  requestWithDefaults
) => {
  const { body: playbookRunHistory } = await requestWithDefaults({
    url: `${options.url}/inv-playbook/${incident.id}`,
    method: 'GET',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    }
  })
    .then(checkForInternalDemistoError)
    .catch((error) => {
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
