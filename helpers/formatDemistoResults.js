const fp = require('lodash/fp');
const moment = require('moment');

const {
  RELEVANT_INDICATOR_SEARCH_RESULT_KEYS,
  HUMAN_READABLE_SEVERITY_LEVELS
} = require('./constants');

const { getKeys } = require('./dataTransformations');

const formatDemistoResults = (entities, incidents, indicators, evidence, options, Logger) =>
  fp.map((entity) => {
    const incidentsForThisEntity = getIncidentsForThisEntity(incidents, entity);

    const evidenceForThisEntity = getEvidenceForThisEntity(evidence, entity);

    const indicatorsForThisEntity = getIndicatorsForThisEntity(indicators, entity).map(
      (indicator) => {
        if (Array.isArray(indicator.comments)) {
          indicator.comments = indicator.comments.filter(
            (comment) => comment.type === 'IndicatorCommentRegular'
          );
        }
        return indicator;
      }
    );

    const allowIncidentCreation =
      entity.requestContext.requestType === 'OnDemand' && options.allowIncidentCreation;

    return incidentsForThisEntity.length
      ? _formatFoundIncidentResults(
          entity,
          incidentsForThisEntity,
          indicatorsForThisEntity,
          evidenceForThisEntity,
          options,
          Logger
        )
      : indicatorsForThisEntity.length ||
        allowIncidentCreation ||
        evidenceForThisEntity.length > 0
      ? _formatNoIncidentFoundResults(
          entity,
          indicatorsForThisEntity,
          evidenceForThisEntity,
          allowIncidentCreation,
          options,
          Logger
        )
      : { entity, data: null };
  }, entities);
const getIncidentsForThisEntity = (incidents, entity) =>
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
    incidents
  );

const getIndicatorsForThisEntity = (indicators, entity) =>
  fp.filter(({ name }) => fp.toLower(name) === fp.toLower(entity.value), indicators);

/**
 * Evidence Search only searches the description field of a piece of evidence so we look for the entity value in
 * the description field only.
 *
 * @param indicators
 * @param entity
 * @returns {{readonly description?: *}[]}
 */
const getEvidenceForThisEntity = (indicators, entity) =>
  fp.filter(
    ({ description }) => fp.toLower(description).includes(fp.toLower(entity.value)),
    indicators
  );

const _formatFoundIncidentResults = (
  entity,
  incidentsForThisEntity,
  indicatorsForThisEntity,
  evidenceForThisEntity,
  options,
  Logger
) => ({
  entity,
  data: {
    summary: createSummary(
      incidentsForThisEntity,
      indicatorsForThisEntity,
      evidenceForThisEntity,
      [],
      Logger
    ),
    details: {
      playbooks: [], // playbooks are popualted via onMessage
      incidents: getKeys(RELEVANT_INDICATOR_SEARCH_RESULT_KEYS, incidentsForThisEntity),
      indicators: indicatorsForThisEntity,
      baseUrl: `${options.url}${options.apiKeyId.length > 0 ? '' : '/#'}`,
      evidence: evidenceForThisEntity
    }
  }
});

const _formatNoIncidentFoundResults = (
  entity,
  indicatorsForThisEntity,
  evidenceForThisEntity,
  allowIncidentCreation,
  options,
  Logger
) => ({
  entity,
  isVolatile: true,
  data: {
    summary: [
      'No Incident Found',
      ...(indicatorsForThisEntity.length === 0 ? ['No Indicators Found'] : []),
      ...createSummary([], indicatorsForThisEntity, evidenceForThisEntity, [], Logger)
    ],
    details: {
      playbooks: [], //playbooks are populated via onMessage
      onDemand: true,
      baseUrl: `${options.url}${options.apiKeyId.length > 0 ? '' : '/#'}`,
      allowIncidentCreation,
      indicators: indicatorsForThisEntity,
      evidence: evidenceForThisEntity
    }
  }
});

const createSummary = (
  incidentsForThisEntity,
  indicatorsForThisEntity,
  evidenceForThisEntity,
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

  const evidence =
    evidenceForThisEntity.length > 0 ? [`Evidence: ${evidenceForThisEntity.length}`] : [];

  const summary = [
    ...types,
    ...(incidentsForThisEntity.length &&
    (severity || severity === 0) &&
    HUMAN_READABLE_SEVERITY_LEVELS[severity]
      ? [`Severity: ${HUMAN_READABLE_SEVERITY_LEVELS[severity]}`]
      : []),
    ...(indicatorsForThisEntity.length
      ? [
          `Reputation: ${
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
    ...indicatorDates,
    ...evidence
  ];

  return fp.flow(fp.concat(previousSummary), fp.uniq, fp.compact)(summary);
};

module.exports = {
  formatDemistoResults,
  createSummary
};
