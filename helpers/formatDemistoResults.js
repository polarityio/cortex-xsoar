const fp = require('lodash/fp');
const moment = require('moment');
const {
  helpers: { filterObjectsContainingString }
} = require('polarity-integration-utils');

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
        const indicatorsForThisEntity = getIndicatorsForThisEntity(indicators, entity);

        const incidentsForThisEntity = getIncidentsForThisEntity(
          incidentsWithPlaybookRunHistory,
          indicatorsForThisEntity,
          entity
        );

        const allowIncidentCreation =
          entity.requestContext &&
          entity.requestContext.requestType === 'OnDemand' &&
          options.allowIncidentCreation;

        return incidentsForThisEntity.length
          ? _formatFoundIncidentResults(
              entity,
              incidentsForThisEntity,
              indicatorsForThisEntity,
              playbooks,
              options,
              Logger
            )
          : indicatorsForThisEntity.length || allowIncidentCreation
          ? _formatNoIncidentFoundResults(
              entity,
              indicatorsForThisEntity,
              playbooks,
              allowIncidentCreation,
              options,
              Logger
            )
          : { entity, data: null };
      }, entities),
    entityGroupsWithPlaybooks
  );
const getIncidentsForThisEntity = (
  incidentsWithPlaybookRunHistory,
  indicatorsForThisEntity,
  entity
) => {
  const indicatorInvestigationIDs = fp.flow(
    fp.flatMap(fp.get('investigationIDs')),
    fp.uniq
  )(indicatorsForThisEntity);

  const lowerCaseEntityValue = fp.flow(fp.get('value'), fp.toLower)(entity);

  const indicatorRelatedIncidents = fp.filter((incident) => {
    const incidentIsIncludedInIndicators = indicatorInvestigationIDs.includes(
      incident.id
    );

    const entityIsInIncident = fp.size(
      filterObjectsContainingString(lowerCaseEntityValue, [incident])
    );

    return incidentIsIncludedInIndicators || entityIsInIncident;
  }, incidentsWithPlaybookRunHistory);

  return indicatorRelatedIncidents;
};

const getIndicatorsForThisEntity = (indicators, entity) =>
  fp.filter(({ value, comments }) => {
    const lowerCaseEntityValue = fp.flow(fp.get('value'), fp.toLower)(entity);

    const entityIsInIndicatorValue = fp.includes(fp.toLower(value), lowerCaseEntityValue);

    const entityIsIncludedInIndicatorComments = fp.flow(
      fp.map('content'),
      fp.join(''),
      fp.toLower,
      fp.includes(lowerCaseEntityValue)
    )(comments);

    return entityIsInIndicatorValue || entityIsIncludedInIndicatorComments;
  }, indicators);

const _formatFoundIncidentResults = (
  entity,
  incidentsForThisEntity,
  indicatorsForThisEntity,
  playbooks,
  options,
  Logger
) => ({
  entity,
  data: {
    summary: createSummary(incidentsForThisEntity, indicatorsForThisEntity, [], Logger),
    details: {
      playbooks,
      incidents: fp.map(formatIncidentDate, incidentsForThisEntity),
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
  options,
  Logger
) => ({
  entity,
  isVolatile: true,
  data: {
    summary: [
      'No Incident Found',
      ...(indicatorsForThisEntity.length
        ? createSummary([], indicatorsForThisEntity, [], Logger)
        : ['No Indicators Found'])
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

const formatIncidentDate = (incident) => ({
  ...incident,
  created: moment(incident.created).format('MMM D YY, h:mm A')
});

const formatIndicatorDates = fp.map(
  ({ firstSeen, lastSeen, ...indicatorForThisEntity }) => ({
    ...indicatorForThisEntity,
    ...(firstSeen && { firstSeen: moment(firstSeen).format('MMM D YY, h:mm A') }),
    ...(lastSeen && { lastSeen: moment(lastSeen).format('MMM D YY, h:mm A') })
  })
);

const createSummary = (
  incidentsForThisEntity,
  indicatorsForThisEntity,
  previousSummary = [],
  Logger
) => {
  const severity = fp.flow(
    fp.map(fp.get('severity')),
    fp.max,
    fp.defaultTo(0)
  )(incidentsForThisEntity);

  const score = fp.flow(
    fp.map(fp.get('score')),
    fp.max,
    fp.defaultTo(0)
  )(indicatorsForThisEntity);

  const indicatorDates = fp.flow(
    fp.maxBy('score'),
    fp.thru((indicator) =>
      indicator
        ? [
            ...(indicator.firstSeen
              ? [`First Seen: ${moment(indicator.firstSeen).format('MMM D YY')}`]
              : []),
            ...(indicator.lastSeen
              ? [`Last Seen: ${moment(indicator.lastSeen).format('MMM D YY')}`]
              : [])
          ]
        : []
    )
  )(indicatorsForThisEntity);

  const uniqFlatMap = (func) =>
    fp.flow(
      fp.flatMap(func),
      fp.uniq,
      fp.filter((x) => !fp.isEmpty(x))
    )(incidentsForThisEntity);

  const types = uniqFlatMap(({ type }) => type && `Type: ${type}`);

  const summary = [
    ...types,
    ...(incidentsForThisEntity.length &&
    (severity || severity === 0) &&
    HUMAN_READABLE_SEVERITY_LEVELS[severity]
      ? [`Severity: ${HUMAN_READABLE_SEVERITY_LEVELS[severity]}`]
      : []),
    ...(indicatorsForThisEntity.length
      ? [
          `Reputatation: ${
            score === 1
              ? 'Good'
              : score === 2
              ? 'Suspicious'
              : score === 3
              ? 'Bad'
              : 'None'
          }`
        ]
      : []),
    ...indicatorDates
  ];

  return fp.flow(fp.concat(previousSummary), fp.uniq, fp.compact)(summary);
};

module.exports = {
  formatDemistoResults,
  formatIncidentDate,
  createSummary
};
