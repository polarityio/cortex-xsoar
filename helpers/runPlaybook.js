const { createSummary } = require('./formatDemistoResults');
const fp = require('lodash/fp');
const { formatIncidentDate } = require('./formatDemistoResults');
const { formatPlaybookRunHistory } = require('./getPlaybookRunHistoryForIncidents');

const runPlaybook = async (
  {
    incidentId,
    playbookId,
    entityValue,
    summary,
    submissionDetails,
    severity,
    selectedType
  },
  options,
  requestWithDefaults,
  callback,
  Logger,
  tryAgain = true
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
          summary,
          playbookId,
          submissionDetails,
          severity,
          selectedType,
          options,
          Logger,
          requestWithDefaults
        );

    callback(null, playbookRunResult);
  } catch (error) {
    if (
      tryAgain &&
      error.status === 403 &&
      (fp.getOr('', 'description', error).includes('Could not find investigations') ||
        fp
          .getOr('', 'description.error', error)
          .includes('Could not find investigations') ||
        fp
          .getOr('', 'description.detail', error)
          .includes('Could not find investigations'))
    ) {
      return runPlaybook(
        {
          incidentId,
          playbookId,
          entityValue,
          submissionDetails,
          severity,
          selectedType
        },
        options,
        requestWithDefaults,
        callback,
        Logger,
        false
      );
    }

    Logger.error(
      error,
      {
        errors: [error],
        type: typeof error
      },
      'Playbook Run Failed'
    );
    callback({
      errors: [
        {
          detail: error.description,
          ...error
        }
      ]
    });
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
  })
    .catch((error) => {
      Logger.error({ error }, 'Playbook Run Error');
      throw error;
    });

const _createContainerAndRunPlaybook = async (
  entityValue,
  summary,
  playbookId,
  submissionDetails,
  severity,
  selectedType,
  options,
  Logger,
  requestWithDefaults
) => {
  try {
    const { body: newlyCreatedIncident } = await _createIncidentAndRunPlaybook(
      entityValue,
      playbookId,
      submissionDetails,
      severity,
      selectedType,
      options,
      requestWithDefaults
    );

    const newIncident = formatIncidentDate(newlyCreatedIncident);

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
      newSummary: createSummary([newIncident], [], summary)
    };
  } catch (error) {
    Logger.error(error, 'Incident Creation or Playbook Run Error');
    throw error;
  }
};

const _createIncidentAndRunPlaybook = (
  entityValue,
  playbookId,
  submissionDetails,
  severity,
  selectedType,
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
      ...(playbookId && { playbookId }),
      ...(selectedType && { type: selectedType.id }),
      severity: fp.toNumber(severity),
      labels: [
        {
          type: 'Origin',
          value: 'Polarity'
        }
      ],
      ...(submissionDetails && { details: submissionDetails })
    }
  });

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
  });

const _getPlaybookRunHistory = (newIncident, options, requestWithDefaults) =>
  requestWithDefaults({
    url: `${options.url}/inv-playbook/${newIncident.id}`,
    method: 'GET',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    }
  });

module.exports = runPlaybook;
