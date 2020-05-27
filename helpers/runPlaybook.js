const { createSummary } = require('./formatDemistoResults');

const { checkForInternalDemistoError } = require('./handleError');
const { formatIncidentDate } = require('./formatDemistoResults');
const { formatPlaybookRunHistory } = require('./getPlaybookRunHistoryForIncidents');

const runPlaybook = async (
  Logger,
  requestWithDefaults,
  { data: { incidentId, playbookId, entityValue } },
  options,
  callback
) => {
  try {
    const playbookRunResult = incidentId
      ? await _runPlaybookOnExistingIncident(
          incidentId,
          playbookId,
          options,
          Logger,
          requestWithDefaults
        )
      : await _createContainerAndRunPlaybook(
          entityValue,
          playbookId,
          options,
          Logger,
          requestWithDefaults
        );

    callback(null, playbookRunResult);
  } catch (error) {
    Logger.error({ error }, 'Playbook Run Failed');
    callback({ err: 'Failed to Run Playbook', detail: error });
  }
};

const _runPlaybookOnExistingIncident = async (
  incidentId,
  playbookId,
  options,
  Logger,
  requestWithDefaults
) => {
  const { body: playbookRunHistory, error } = await _runPlaybook(
    options,
    playbookId,
    incidentId,
    Logger,
    requestWithDefaults
  );

  const formattedPlaybookHistory = formatPlaybookRunHistory(playbookRunHistory);

  return {
    err: error,
    pbHistory: formattedPlaybookHistory
  };
};

const _runPlaybook = (options, playbookId, incidentId, Logger, requestWithDefaults) =>
  requestWithDefaults({
    url: `${options.url}/inv-playbook/new/${playbookId}/${incidentId}`,
    method: 'POST',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    },
    data: {}
  })
    .then(checkForInternalDemistoError)
    .catch((error) => {
      Logger.error({ error }, 'Playbook Run Error');
      return { error };
    });

const _createContainerAndRunPlaybook = async (
  entityValue,
  playbookId,
  options,
  Logger,
  requestWithDefaults
) => {
  let newIncident;
  try {
    const { body: newlyCreatedIncident } = await _createIncidentAndRunPlaybook(
      entityValue,
      playbookId,
      options,
      requestWithDefaults
    );

    newIncident = formatIncidentDate(newlyCreatedIncident);

    await _startInvestigation(newIncident, options, requestWithDefaults);

    const { body: playbookRunHistory } = await _getPlaybookRunHistory(
      newIncident,
      options,
      requestWithDefaults
    );

    const formattedPlaybookHistory = formatPlaybookRunHistory(playbookRunHistory);

    return {
      pbHistory: formattedPlaybookHistory,
      newIncident,
      newSummary: createSummary([newIncident])
    };
  } catch (error) {
    Logger.error({ error }, 'Incident Creation or Playbook Run Error');
    throw error
  }
};

const _createIncidentAndRunPlaybook = (
  entityValue,
  playbookId,
  options,
  requestWithDefaults
) =>
  requestWithDefaults({
    url: `${options.url}/incident`,
    method: 'POST',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    },
    body: {
      name: entityValue,
      playbookId,
      severity: 3,
      labels: [
        {
          type: 'Origin',
          value: 'Polarity'
        }
      ],
      details: 'This is an Incident uploaded from Polarity'
    }
  }).then(checkForInternalDemistoError);

const _startInvestigation = (newIncident, options, requestWithDefaults) =>
  requestWithDefaults({
    url: `${options.url}/incident/investigate`,
    method: 'POST',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    },
    body: {
      id: newIncident.id,
      version: 1
    }
  }).then(checkForInternalDemistoError);

const _getPlaybookRunHistory = (newIncident, options, requestWithDefaults) =>
  requestWithDefaults({
    url: `${options.url}/inv-playbook/${newIncident.id}`,
    method: 'GET',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    }
  }).then(checkForInternalDemistoError);

module.exports = runPlaybook;
