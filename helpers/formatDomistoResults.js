const _ = require('lodash');
const moment = require('moment');

const { RELEVANT_INDICATOR_SEARCH_RESULT_KEYS } = require('./constants');

const { getKeys } = require('./dataTransformations');

const formatDomistoResults = (
  entityGroupsWithPlaybooks,
  incidentsWithPlaybookRunHistory,
  options
) =>
  _.flatMap(entityGroupsWithPlaybooks, ({ entities, playbooks }) =>
    entities.map((entity) => {
      const incidentsForThisEntity = incidentsWithPlaybookRunHistory.filter(
        ({ name }) => name === entity.value
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
  const result = {
    ...results[0],
    severity: results[0].severity || 'Unknown'
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

module.exports = {
  formatDomistoResults,
  formatIncidentDate,
  createSummary
};