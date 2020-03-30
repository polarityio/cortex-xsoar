const _ = require('lodash');
const moment = require('moment');

const { _P } = require('./dataTransformations');
const { checkForInternalDemistoError } = require('./handleError');

const getPlaybookRunHistoryForIncidents = (
  entitiesPartition,
  incidents,
  options,
  Logger,
  axiosWithDefaults
) =>
  _P.map(incidents, async (incident) => {
    const playbookRunHistory = await getPlaybookRunHistory(
      entitiesPartition,
      incident,
      options,
      Logger,
      axiosWithDefaults
    );

    const pbHistoryWithFormattedDates = formatPlaybookRunHistory(playbookRunHistory);

    return {
      ...incident,
      pbHistory: pbHistoryWithFormattedDates
    };
  });

const getPlaybookRunHistory = async (
  entitiesPartition,
  incident,
  options,
  Logger,
  axiosWithDefaults
) => {
  const { data: playbookRunHistory } = await axiosWithDefaults({
    url: `${options.url}/inv-playbook/${incident.id}`,
    method: 'get',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    },
    data: {
      filter: {
        name: entitiesPartition.map(({ value }) => value)
      }
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
