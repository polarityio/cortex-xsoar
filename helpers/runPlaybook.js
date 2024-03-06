const { createSummary } = require('./formatDemistoResults');
const { formatPlaybookRunHistory } = require('./getPlaybookRunHistoryForIncidents');
const { getOr, toNumber } = require('lodash/fp');

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
    const err = JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));

    if (
      tryAgain &&
      err.status === 403 &&
      (getOr('', 'description', err).includes('Could not find investigations') ||
        getOr('', 'description.error', err).includes('Could not find investigations') ||
        getOr('', 'description.detail', err).includes('Could not find investigations'))
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
      {
        detail: 'Failed to Run Playbook',
        options,
        formattedError: err
      },
      'Running Playbook Failed'
    );

    const { title, detail, code } = getOr(
      {
        title: error.message,
        detail: 'Running Playbook was Unsuccessful',
        code: error.status
      },
      'errors.0',
      err.description && err.description[0] === '{'
        ? JSON.parse(err.description)
        : err.description
    );
    return callback({
      errors: [
        {
          err: error,
          detail: `${title}${detail ? ` - ${detail}` : ''}${
            code ? `, Code: ${code}` : ''
          }`
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
    }
  }).catch((error) => {
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

    await _startInvestigation(newlyCreatedIncident, options, requestWithDefaults);

    const { body: playbookRunHistory } = await _getPlaybookRunHistory(
      newIncident,
      options,
      requestWithDefaults
    );

    const formattedPlaybookHistory = formatPlaybookRunHistory(playbookRunHistory);

    return {
      pbHistory: formattedPlaybookHistory,
      newIncident,
      newSummary: createSummary([newIncident], [], summary, Logger)
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
      severity: toNumber(severity),
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
