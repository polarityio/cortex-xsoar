const _ = require('lodash');
const moment = require('moment');

const {
  RELEVANT_INDICATOR_SEARCH_RESULT_KEYS,
  HUMAN_READABLE_SEVERITY_LEVELS
} = require('./constants');

const { getKeys } = require('./dataTransformations');

const formatDemistoResults = (
  entityGroupsWithPlaybooks,
  incidentsWithPlaybookRunHistory,
  options
) =>
  _.flatMap(entityGroupsWithPlaybooks, ({ entities, playbooks }) =>
    entities.map((entity) => {
      const incidentsForThisEntity = incidentsWithPlaybookRunHistory.filter(
        ({ name, labels }) =>
          name.includes(entity.value) ||
          labels.some(({ value }) => value.includes(entity.value))
      );

      const incidentFoundInDemisto =
        incidentsForThisEntity && incidentsForThisEntity.length;

      const isOnDemand = entity.requestContext.requestType === 'OnDemand';

      return (
        incidentFoundInDemisto ?
          _formatFoundIncidentResults(entity, incidentsForThisEntity, playbooks, options) :
        isOnDemand ?
          _formatNewIncidentResults(entity, playbooks, options) :
          { entity, data: null }
      );
    })
  );

const _formatFoundIncidentResults = (
  entity,
  incidentsForThisEntity,
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

const createSummary = (results) => {
  const severity = Math.max(results.map(({ severity }) => severity)) || 'Unknown';

  const uniqFlatMap = (func) => _.chain(results).flatMap(func).uniq().value();

  const labels = uniqFlatMap(({ labels }) => labels.map(({ type, value }) => `${type}: ${value}`));

  const categories = uniqFlatMap(({ category }) => `Category: ${category}`);

  const types = uniqFlatMap(({ type }) => `Type: ${type}`);

  const summary = [
    `Severity: ${HUMAN_READABLE_SEVERITY_LEVELS[severity]}`,
    ...types,
    ...categories,
    ...labels
  ];

  return summary.filter(_.identity);
};

module.exports = {
  formatDemistoResults,
  formatIncidentDate,
  createSummary
};