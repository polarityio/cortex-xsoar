const fp = require('lodash/fp');
const moment = require('moment');

const {
  RELEVANT_INCIDENT_SEARCH_RESULT_KEYS,
  HUMAN_READABLE_SEVERITY_LEVELS
} = require('./constants');

const _ = require('lodash');

const formatDemistoResults = (
  entities,
  incidentResults,
  indicatorResults,
  evidenceResults,
  options,
  Logger
) =>
  entities.map((entity) => {
    const incidentsForThisEntity = getIncidentsForThisEntity(incidentResults, entity);

    // add a synthetic index value to be used for paging in the template
    incidentsForThisEntity.forEach((result, index) => {
      result.incident.__index = index;
    });

    const evidenceForThisEntity = getEvidenceForThisEntity(evidenceResults, entity);

    const indicatorsForThisEntity = getIndicatorsForThisEntity(
      indicatorResults,
      entity
    ).map((indicatorResult) => {
      if (Array.isArray(indicatorResult.indicator.comments)) {
        indicatorResult.indicator.comments = indicatorResult.indicator.comments.filter(
          (comment) => comment.type === 'IndicatorCommentRegular'
        );
      }
      return indicatorResult;
    });

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
  });

const getIncidentsForThisEntity = (incidentResults, entity) => {
  return incidentResults.filter(
    (result) =>
      incidentNameMatches(result.incident, entity) ||
      incidentLabelMatches(result.incident, entity) ||
      incidentDetailsMatches(result.incident, entity) ||
      result.highlightsAsString.includes(entity.value.toLowerCase())
  );
};

const incidentDetailsMatches = (incident, entity) => {
  return (
    incident.details &&
    typeof incident.details === 'string' &&
    incident.details.toLowerCase().includes(entity.value.toLowerCase())
  );
};

const incidentNameMatches = (incident, entity) => {
  return (
    incident.name && incident.name.toLowerCase().includes(entity.value.toLowerCase())
  );
};

const incidentLabelMatches = (incident, entity) => {
  return incident.labels.some(
    (label) =>
      label &&
      label.value &&
      label.value.toLowerCase().includes(entity.value.toLowerCase())
  );
};

const getIndicatorsForThisEntity = (indicatorResults, entity) => {
  return indicatorResults.filter(
    (result) => result.indicator.name.toLowerCase() === entity.value.toLowerCase()
  );
};

/**
 * Evidence Search only searches the description field of a piece of evidence so we look for the entity value in
 * the description field only.
 *
 * @param indicators
 * @param entity
 * @returns {{readonly description?: *}[]}
 */
const getEvidenceForThisEntity = (evidenceResults, entity) => {
  return evidenceResults.filter(
    (result) =>
      evidenceDescriptionMatches(result.evidence, entity) ||
      result.highlightsAsString.includes(entity.value.toLowerCase())
  );
};

const evidenceDescriptionMatches = (evidence, entity) => {
  return (
    evidence.description &&
    evidence.description.toLowerCase().includes(entity.value.toLowerCase())
  );
};

const getKeys = (keysToPick, items, itemKey = '') =>
  items.map((item) => {
    const pickedKeys = _.pickBy(itemKey ? item[itemKey] : item, (v, key) =>
      keysToPick.includes(key)
    );
    if (itemKey) {
      item[itemKey] = pickedKeys;
    } else {
      item = pickedKeys;
    }
    return item;
  });

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
      playbooks: [], // playbooks are populated via onMessage
      incidents: getKeys(
        RELEVANT_INCIDENT_SEARCH_RESULT_KEYS,
        incidentsForThisEntity,
        'incident'
      ),
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
    fp.map(fp.get('incident.severity')),
    fp.max,
    fp.defaultTo(0)
  )(incidentsForThisEntity);

  const score = fp.flow(
    fp.map(fp.get('indicator.score')),
    fp.max,
    fp.defaultTo(0)
  )(indicatorsForThisEntity);

  const indicatorDates = fp.flow(
    fp.maxBy('indicator.score'),
    fp.thru((indicator) => {
      return indicator
        ? [
            ...(indicator.indicator.firstSeen
              ? [`First Seen: ${moment(indicator.indicator.firstSeen).format('ll')}`]
              : []),
            ...(indicator.indicator.lastSeen
              ? [`Last Seen: ${moment(indicator.indicator.lastSeen).format('ll')}`]
              : [])
          ]
        : [];
    })
  )(indicatorsForThisEntity);

  const types = [
    ...new Set(
      incidentsForThisEntity.reduce((accum, incidentResult, index, list) => {
        let type = incidentResult.incident.type;

        if (accum.length <= 3) {
          accum.push(`Type: ${type}`);
          return accum;
        }

        // this is the last incident
        if (index === list.length - 1) {
          const numAdditional = list.length - accum.length;
          accum.push(`+${numAdditional} type${numAdditional > 1 ? 's' : ''}`);
        }

        return accum;
      }, [])
    )
  ];

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
