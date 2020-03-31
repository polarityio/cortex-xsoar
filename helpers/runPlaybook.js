const { createSummary } = require('./formatDomistoResults');

const { checkForInternalDemistoError } = require('./handleError');
const { formatIncidentDate } = require('./formatDomistoResults');
const { formatPlaybookRunHistory } = require('./getPlaybookRunHistoryForIncidents');

const runPlaybook = async (
  Logger,
  axiosWithDefaults,
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
          axiosWithDefaults
        )
      : await _createContainerAndRunPlaybook(
          entityValue,
          playbookId,
          options,
          Logger,
          axiosWithDefaults
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
  axiosWithDefaults
) => {
  const { data: playbookRunHistory, error } = await _runPlaybook(
    options,
    playbookId,
    incidentId,
    Logger,
    axiosWithDefaults
  );

  const formattedPlaybookHistory = formatPlaybookRunHistory(playbookRunHistory);

  return {
    err: error,
    pbHistory: formattedPlaybookHistory
  };
};

const _runPlaybook = (options, playbookId, incidentId, Logger, axiosWithDefaults) =>
  axiosWithDefaults({
    url: `${options.url}/inv-playbook/new/${playbookId}/${incidentId}`,
    method: 'post',
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
  axiosWithDefaults
) => {
  let newIncident;
  try {
    const { data: newlyCreatedIncident } = await _createIncidentAndRunPlaybook(
      entityValue,
      playbookId,
      options,
      axiosWithDefaults
    );

    newIncident = formatIncidentDate(newlyCreatedIncident);

    await _startInvestigation(newIncident, options, axiosWithDefaults);

    const { data: playbookRunHistory } = await _getPlaybookRunHistory(
      newIncident,
      options,
      axiosWithDefaults
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
  axiosWithDefaults
) =>
  axiosWithDefaults({
    url: `${options.url}/incident`,
    method: 'post',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    },
    data: {
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

const _startInvestigation = (newIncident, options, axiosWithDefaults) =>
  axiosWithDefaults({
    url: `${options.url}/incident/investigate`,
    method: 'post',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    },
    data: {
      id: newIncident.id,
      version: 1
    }
  }).then(checkForInternalDemistoError);

const _getPlaybookRunHistory = (newIncident, options, axiosWithDefaults) =>
  axiosWithDefaults({
    url: `${options.url}/inv-playbook/${newIncident.id}`,
    method: 'get',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    }
  }).then(checkForInternalDemistoError);

module.exports = runPlaybook;
