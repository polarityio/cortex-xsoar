const async = require('async');

let Logger;

function parseErrorToReadableJSON(error) {
  if (error instanceof Error) {
    return JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));
  } else {
    return error;
  }
}

async function writeToIncident(
  { entityValue, incidentId, integrations },
  options,
  requestWithDefaults,
  callback,
  logger
) {
  Logger = logger;
  Logger.trace({ entityValue, incidentId, integrations }, 'writeToIncident');

  async.eachLimit(
    integrations,
    10,
    async (integration) => {
      const { integrationName, data } = integration;
      const description = `${integrationName} enrichment data in Polarity for ${entityValue}`;

      Logger.debug(
        {
          integrationName,
          integrationData: data,
          entityValue,
          incidentId,
          description
        },
        'Adding integration data to XSOAR'
      );

      let warRoomId = await addIntegrationDataToEntry(
        data,
        incidentId,
        requestWithDefaults,
        options
      );

      Logger.debug({ warRoomId }, 'Adding Evidence to XSOAR');

      await addEvidence(
        warRoomId,
        integrationName,
        description,
        incidentId,
        requestWithDefaults,
        options
      );
    },
    (err) => {
      if (err) {
        let parsedError = parseErrorToReadableJSON(err);
        Logger.error({ parsedError, err }, 'Error when submitting evidence');
        callback(err);
      } else {
        callback(null, {
          success: true
        });
      }
    }
  );
}

/**
 * Adds a data entry to the War Room and returns the entry id
 *
 * @param integrationData
 * @param incidentId
 * @param requestWithDefaults
 * @param options
 * @returns {Promise<*>}
 */
async function addIntegrationDataToEntry(
  integrationData,
  incidentId,
  requestWithDefaults,
  options
) {
  let requestOptions = {
    url: `${options.apiUrl}/${options.apiKeyId.length > 0 ? 'xsoar/' : ''}entry/formatted`,
    method: 'POST',
    json: true,
    headers: {
      authorization: options.apiKey,
      'x-xdr-auth-id': options.apiKeyId
    },
    body: {
      // This value must be an escape JSON string
      contents: JSON.stringify(integrationData),
      investigationId: incidentId
    }
  };

  const { statusCode, body } = await requestWithDefaults(requestOptions);
  Logger.debug({ statusCode, body }, 'Result of `POST /entry/formatted`');
  return body.id;
}

async function addEvidence(
  warRoomDataId,
  integrationName,
  description,
  incidentId,
  requestWithDefaults,
  options
) {
  const requestOptions = {
    url: `${options.apiUrl}/${options.apiKeyId.length > 0 ? 'xsoar/' : ''}evidence`,
    method: 'POST',
    json: true,
    headers: {
      authorization: options.apiKey,
      'x-xdr-auth-id': options.apiKeyId
    },
    body: {
      entryId: warRoomDataId,
      description,
      incidentId,
      occurred: new Date().toISOString(),
      markedBy: options._request.user.username,
      tags: ['Polarity', integrationName]
    }
  };

  const { statusCode, body } = await requestWithDefaults(requestOptions);
  Logger.debug({ statusCode, body }, 'Result of `POST /evidence`');

  return body;
}

module.exports = writeToIncident;
