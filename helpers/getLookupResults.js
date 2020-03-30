const _ = require('lodash');
const moment = require('moment');
const Aigle = require('aigle');
const _P = Aigle.mixin(_);

const {
  IGNORED_IPS,
  RELEVANT_INDICATOR_SEARCH_RESULT_KEYS,
  PLAYBOOK_SEARCH_TERMS
} = require('./constants');
const { _partitionFlatMap, getKeys } = require('./dataTransformations');

const getLookupResults = (entities, options, axiosWithDefaults, Logger) =>
  _partitionFlatMap(
    async (_entitiesPartition) => {
      const { ignoredIPs, entitiesPartition } = _.groupBy(
        _entitiesPartition,
        ({ isIP, value }) =>
          !isIP || (isIP && !IGNORED_IPS.has(value)) ? 'entitiesPartition' : 'ignoredIPs'
      );

      const entityGroupsWithPlaybooks = await _P
        .chain(entitiesPartition)
        .groupBy(({ isIP, isHash, isDomain, isEmail }) =>
          isIP ? 'ip' : isHash ? 'hash' : isDomain ? 'domain' : isEmail && 'email'
        )
        .reduce(async (agg, entities, entityType) => {
          const {
            data: { playbooks }
          } = await axiosWithDefaults({
            url: `${options.url}/playbook/search`,
            method: 'post',
            headers: {
              authorization: options.apiKey,
              'Content-type': 'application/json'
            },
            data: {
              query: PLAYBOOK_SEARCH_TERMS[entityType]
            }
          })
            .then(_checkForInternalDemistoError)
            .catch((error) => {
              Logger.error({ error }, 'Incident Query Error');
              throw error;
            });

          return {
            ...agg,
            [entityType]: {
              entities,
              playbooks
            }
          };
        }, {})
        .value();

      const {
        data: { data: incidents }
      } = await axiosWithDefaults({
        url: `${options.url}/incidents/search`,
        method: 'post',
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
        .then(_checkForInternalDemistoError)
        .catch((error) => {
          Logger.error({ error }, 'Incident Query Error');
          throw error;
        });

      const incidentsWithPlaybookRunHistory = await _P.map(
        incidents,
        async (incident) => {
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
            .then(_checkForInternalDemistoError)
            .catch((error) => {
              Logger.error({ error }, 'Incident Query Error');
              throw error;
            });

          const pbHistoryWithFormattedDates = formatPlaybookRunHistory(
            playbookRunHistory
          );

          return {
            ...incident,
            pbHistory: pbHistoryWithFormattedDates
          };
        }
      );

      const lookupResults = _.flatMap(
        entityGroupsWithPlaybooks,
        ({ entities, playbooks }) =>
          _.map(entities, (entity) =>
            _.chain(incidentsWithPlaybookRunHistory)
              .filter(({ name }) => name === entity.value)
              .thru((incidents) => {
                if (incidents && incidents.length) {
                  return {
                    entity,
                    data: {
                      summary: createSummary(incidents),
                      details: {
                        playbooks,
                        incidents: getKeys(
                          RELEVANT_INDICATOR_SEARCH_RESULT_KEYS,
                          incidents
                        ).map(({ created, ...incident }) => ({
                          ...incident,
                          created: moment(created).format('MMM D YY, h:mm A')
                        })),
                        baseUrl: `${options.url}/#`
                      }
                    }
                  };
                } else if (entity.requestContext.requestType === 'OnDemand') {
                  return {
                    entity,
                    isVolatile: true,
                    data: {
                      summary: ['No Incident Found'],
                      details: {
                        playbooks,
                        onDemand: true,
                        baseUrl: `${options.url}/#`
                      }
                    }
                  };
                } else {
                  return { entity, data: null };
                }
              })
              .value()
          )
      );

      return lookupResults.concat(
        _.map(ignoredIPs, (entity) => ({ entity, data: null }))
      );
    },
    20,
    entities
  );

const _checkForInternalDemistoError = (response) => {
  const { error, detail } = response;
  if (error) {
    const internalDemistoError = Error('Internal Demisto Query Error');
    internalDemistoError.status = 'internalDemistoError';
    internalDemistoError.description = `${error} -> ${detail}`;
    throw internalDemistoError;
  }
  return response;
};

const createSummary = (results) => {
  const result = {
    ...results[0],
    severity: results[0].severity || "Unknown"
  };
  const labels = result.labels.map(({ value }) => value);
  const summary = [
    result.type,
    `Severity: ${result.severity}`,
    result.category,
    ...labels
  ];

  return summary.filter(_.identity);
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

module.exports = {
  getLookupResults,
  formatPlaybookRunHistory,
  createSummary
};
