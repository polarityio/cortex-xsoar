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
  fp.filter(({ value }) => fp.toLower(value) === fp.toLower(entity.value), indicators);

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
      incidents: getKeys(RELEVANT_INDICATOR_SEARCH_RESULT_KEYS, incidentsForThisEntity),
      indicators: indicatorsForThisEntity,
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
      indicators: indicatorsForThisEntity
    }
  }
});

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
    fp.thru((indicator) => {
      return indicator
        ? [
            ...(indicator.firstSeen
              ? [`First Seen: ${moment(indicator.firstSeen).format('ll')}`]
              : []),
            ...(indicator.lastSeen
              ? [`Last Seen: ${moment(indicator.lastSeen).format('ll')}`]
              : [])
          ]
        : [];
    })
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
  createSummary
};
