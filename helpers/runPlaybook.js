const runPlaybook = async (
  Logger,
  axiosWithDefaults,
  { data: { incidentId, playbookId, entityValue } },
  options,
  callback
) => {
  Logger.trace('testings');
  const playbookRunResult = await _runPlaybookOnExistingIncident(
    incidentId,
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
  Logger.trace({ incidentId, playbookId, options }, "alsjdlfjsldfjl")
  const { data: playbookRunResult, error } = await axiosWithDefaults({
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
    Logger.error({ error }, 'Incident Query Error');
    return { error };
  });
  
  Logger.trace({ playbookRunResult });
  return {
    err: error,
    playbooksRan: [{}],
    playbooksRanCount: 5,
    newIndicator: false,
    status: error ? "Failed" : "Success"
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

const _createContainerAndRunPlaybook = (
  entityValue,
  options,
  actionId,
  phantomPlaybooks,
  callback
) => {
  let containers = new Containers(Logger, options);
  containers.createContainer(entityValue, (err, container) => {
    if (err) return callback({ err: 'Failed to Create Container', detail: err });
    phantomPlaybooks.runPlaybookAgainstIncident(actionId, container.id, (err, resp) => {
      Logger.trace({ resp, err }, 'Result of playbook run');
      if (!resp && !err)
        Logger.error({ err: new Error('No response found!') }, 'Error running playbook');

      phantomPlaybooks.getPlaybookRunHistory([container.id], (error, playbooksRan) => {
        Logger.trace({ playbooksRan, error }, 'Result of playbook run history');
        if (err || error) {
          Logger.trace({ playbooksRan, error }, 'Failed to get Playbook Run History');
          return callback(null, {
            err: err || error,
            ...playbooksRan[0],
            newContainer: {
              ...container,
              playbooksRan: playbooksRan && playbooksRan[0].playbooksRan,
              playbooksRanCount: playbooksRan && playbooksRan[0].playbooksRan.length
            }
          });
        }
        callback(null, {
          ...resp,
          ...playbooksRan[0],
          newContainer: {
            ...container,
            playbooksRan: playbooksRan[0].playbooksRan,
            playbooksRanCount: playbooksRan[0].playbooksRan.length
          }
        });
      });
    });
  });
};

module.exports = runPlaybook;

// if (incidentId) {
// const playbookRunResult = await _runPlaybookOnExistingIncident(
//   incidentId,
//   playbookId,
//   options,
//   axiosWithDefaults
// );
// } else if (entityValue) {
//   _createContainerAndRunPlaybook(
//     entityValue,
//     options,
//     actionId,
//     phantomPlaybooks,
//     callback
//   );
// } else {
//   const err = {
//     err: 'Unexpected Error',
//     detail: 'Error: Unexpected value passed when trying to run a playbook'
//   };
//   Logger.error({ err, incidentId, actionId, entity }, 'Error running playbook');
//   callback(err);
// }
