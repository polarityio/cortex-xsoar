const fp = require('lodash/fp');
const moment = require('moment');

const {
  RELEVANT_INDICATOR_SEARCH_RESULT_KEYS,
  HUMAN_READABLE_SEVERITY_LEVELS
} = require('./constants');

const { getKeys } = require('./dataTransformations');

const formatDemistoResults = (
  entityGroupsWithPlaybooks,
  incidentsWithPlaybookRunHistory,
  indicators,
  options,
  Logger
) =>
  fp.flatMap(
    ({ entities, playbooks }) =>
      fp.map((entity) => {
        const incidentsForThisEntity = getIncidentsForThisEntity(
          incidentsWithPlaybookRunHistory,
          entity
        );

        const indicatorsForThisEntity = getIndicatorsForThisEntity(indicators, entity);

        const allowIncidentCreation =
          entity.requestContext.requestType === 'OnDemand' &&
          options.allowIncidentCreation;

        return incidentsForThisEntity.length
          ? _formatFoundIncidentResults(
              entity,
              incidentsForThisEntity,
              indicatorsForThisEntity,
              playbooks,
              options
            )
          : indicatorsForThisEntity.length || allowIncidentCreation
          ? _formatNoIncidentFoundResults(
              entity,
              indicatorsForThisEntity,
              playbooks,
              allowIncidentCreation,
              options
            )
          : { entity, data: null };
      }, entities),
    entityGroupsWithPlaybooks
  );

const getIncidentsForThisEntity = (incidentsWithPlaybookRunHistory, entity) =>
  fp.filter(
    ({ name, labels }) =>
      fp.flow(
        fp.toLower,
        fp.includes(fp.flow(fp.getOr('', 'value'), fp.toLower)(entity))
      )(name) ||
      fp.some(
        fp.flow(
          fp.getOr('', 'value'),
          fp.toLower,
          fp.includes(fp.flow(fp.getOr('', 'value'), fp.toLower)(entity))
        ),
        labels
      ),
    incidentsWithPlaybookRunHistory
  );

const getIndicatorsForThisEntity = (indicators, entity) =>
  fp.filter(
    ({ value, labels }) => fp.toLower(value) === fp.toLower(entity.value),
    indicators
  );

const _formatFoundIncidentResults = (
  entity,
  incidentsForThisEntity,
  indicatorsForThisEntity,
  playbooks,
  options
) => ({
  entity,
  data: {
    summary: createSummary(incidentsForThisEntity, indicatorsForThisEntity),
    details: {
      playbooks,
      incidents: getKeys(
        RELEVANT_INDICATOR_SEARCH_RESULT_KEYS,
        incidentsForThisEntity
      ).map(formatIncidentDate),
      indicators: formatIndicatorDates(indicatorsForThisEntity),
      baseUrl: `${options.url}/#`
    }
  }
});

const _formatNoIncidentFoundResults = (
  entity,
  indicatorsForThisEntity,
  playbooks,
  allowIncidentCreation,
  options
) => ({
  entity,
  isVolatile: true,
  data: {
    summary: [
      'No Incident Found',
    ],
    details: {
      playbooks,
      onDemand: true,
      baseUrl: `${options.url}/#`,
      allowIncidentCreation,
      indicators: formatIndicatorDates(indicatorsForThisEntity)
    }
  }
});

const formatIncidentDate = ({ created, ...incident }) => ({
  ...incident,
  created: moment(created).format('MMM D YY, h:mm A')
});

const formatIndicatorDates = fp.map(
  ({ firstSeen, lastSeen, ...indicatorForThisEntity }) => ({
    ...indicatorForThisEntity,
    firstSeen: moment(firstSeen).format('MMM D YY, h:mm A'),
    lastSeen: moment(lastSeen).format('MMM D YY, h:mm A')
  })
);

const createSummary = (results, indicators) => {
  const severity = Math.max(results.map(({ severity }) => severity)) || 'Unknown';

  const uniqFlatMap = (func) =>
    fp.flow(
      fp.flatMap(func),
      fp.uniq,
      fp.filter((x) => !fp.isEmpty(x))
    )(results);

  const types = uniqFlatMap(({ type }) => type && `Type: ${type}`);

  const summary = [
    ...types,
    ...(severity && HUMAN_READABLE_SEVERITY_LEVELS[severity]
      ? [`Severity: ${HUMAN_READABLE_SEVERITY_LEVELS[severity]}`]
      : []),
  ];

  return summary;
};

module.exports = {
  formatDemistoResults,
  formatIncidentDate,
  createSummary
};
