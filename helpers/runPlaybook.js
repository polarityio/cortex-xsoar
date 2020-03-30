const moment = require('moment');

const { formatPlaybookRunHistory, createSummary } = require('./getLookupResults');

const runPlaybook = async (
  Logger,
  axiosWithDefaults,
  { data: { incidentId, playbookId, entityValue } },
  options,
  callback
) => {
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
};

const _runPlaybookOnExistingIncident = async (
  incidentId,
  playbookId,
  options,
  Logger,
  axiosWithDefaults
) => {
  const { data: playbookRunHistory, error } = await axiosWithDefaults({
    url: `${options.url}/inv-playbook/new/${playbookId}/${incidentId}`,
    method: 'post',
    headers: {
      authorization: options.apiKey,
      'Content-type': 'application/json'
    },
    data: {}
  })
    .then(_checkForInternalDemistoError)
    .catch((error) => {
      Logger.error({ error }, 'Playbook Run Error');
      return { error };
    });

  const formattedPlaybookHistory = formatPlaybookRunHistory(playbookRunHistory);

  return {
    err: error,
    pbHistory: formattedPlaybookHistory
  };
};

const _checkForInternalDemistoError = (response) => {
  const { error, detail } = response;
  if (error) {
    const internalDemistoError = Error('Internal Demisto Query Error');
    internalDemistoError.status = 'internalDemistoError';
    internalDemistoError.description = `${error} -> ${detail}`;
    throw internalDemistoError;
  }
  return response;
};

const _createContainerAndRunPlaybook = async (
  entityValue,
  playbookId,
  options,
  Logger,
  axiosWithDefaults
) => {
  let newIncident;
  try {
    const { data } = await axiosWithDefaults({
      url: `${options.url}/incident`,
      method: 'post',
      headers: {
        authorization: options.apiKey,
        'Content-type': 'application/json'
      },
      data: {
        name: entityValue,
        playbookId,
        labels: [
          {
            type: 'origin',
            value: 'Polarity'
          }
        ],
        details: 'This is an Incident uploaded from Polarity'
      }
    }).then(_checkForInternalDemistoError);

    newIncident = {
      ...data,
      created: moment(data.created).format('MMM D YY, h:mm A')
    };

    await axiosWithDefaults({
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
    }).then(_checkForInternalDemistoError);

    const { data: playbookRunHistory } = await axiosWithDefaults({
      url: `${options.url}/inv-playbook/${newIncident.id}`,
      method: 'get',
      headers: {
        authorization: options.apiKey,
        'Content-type': 'application/json'
      }
    }).then(_checkForInternalDemistoError);

    const formattedPlaybookHistory = formatPlaybookRunHistory(playbookRunHistory);

    return {
      pbHistory: formattedPlaybookHistory,
      newIncident,
      newSummary: createSummary([newIncident])
    };
  } catch (err) {
    Logger.error({ error: err }, 'Incident Creation or Playbook Run Error');
    return {
      err,
      newIncident
    };
  }
};

module.exports = runPlaybook;
