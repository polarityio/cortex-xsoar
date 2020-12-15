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

        const isOnDemand = entity.requestContext.requestType === 'OnDemand';

        return incidentsForThisEntity.length
          ? _formatFoundIncidentResults(
              entity,
              incidentsForThisEntity,
              indicatorsForThisEntity,
              playbooks,
              options
            )
          : isOnDemand
          ? _formatNewIncidentResults(entity, playbooks, options)
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
    summary: createSummary(incidentsForThisEntity),
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

const _formatNewIncidentResults = (entity, playbooks, options) => ({
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

const createSummary = (results) => {
  const severity = Math.max(results.map(({ severity }) => severity)) || 'Unknown';

  const uniqFlatMap = (func) =>
    fp.flow(
      fp.flatMap(func),
      fp.uniq,
      fp.filter((x) => !fp.isEmpty(x))
    )(results);

  const labels = uniqFlatMap(({ labels }) =>
    labels.map(({ type, value }) => type && value && `${type}: ${value}`)
  );

  const categories = uniqFlatMap(({ category }) => category && `Category: ${category}`);

  const types = uniqFlatMap(({ type }) => type && `Type: ${type}`);

  const summary = [...types, ...categories, ...labels].concat(
    severity && HUMAN_READABLE_SEVERITY_LEVELS[severity]
      ? `Severity: ${HUMAN_READABLE_SEVERITY_LEVELS[severity]}`
      : []
  );

  return summary;
};

module.exports = {
  formatDemistoResults,
  formatIncidentDate,
  createSummary
};
