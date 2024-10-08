const STATUS_CODE_ERROR_MESSAGE = {
  401: (error) => ({
    err: 'Unauthorized',
    detail: 'Unable to authenticate',
    error: errorToPojo(error)
  }),
  400: (error) => ({
    err: 'Bad Request',
    detail: 'Unable to retrieve Auth Token -> ' + `${error.description}`,
    error: errorToPojo(error)
  }),
  403: (error) => ({
    err: 'Token Expired',
    detail:
      'The Token has Expired or is Incorrect.  Verify your token is correct and retry your request to reauthorize.',
    error: errorToPojo(error)
  }),
  404: (error) => ({
    err: 'Not Found',
    detail: 'Requested item doesn’t exist or not enough access permissions',
    error: errorToPojo(error)
  }),
  405: (error) => ({
    err: 'Incident Query Error',
    detail: 'Possible malformed request',
    error: errorToPojo(error)
  }),
  500: (error) => ({
    err: 'Server Error',
    detail: 'Unexpected Server Error',
    error: errorToPojo(error)
  }),
  internalDemistoError: (error) => ({
    err: 'Internal Cortex XSOAR Error',
    detail: 'Internal Cortex XSOAR Error',
    error: errorToPojo(error)
  }),
  unknown: (error) =>
    error.message.includes('getaddrinfo ENOTFOUND')
      ? {
          err: 'Url Not Found',
          detail: 'The Url you used in options was Not Found',
          error: errorToPojo(error)
        }
      : error.message.includes('self signed certificate')
      ? {
          err: 'Problem with Certificate',
          detail: 'A Problem was found with your Certificate',
          error: errorToPojo(error)
        }
      : {
          err: 'Unknown',
          detail: error.message ? error.message : 'Unknown error occurred',
          error: errorToPojo(error)
        }
};

function errorToPojo(err) {
  if (err instanceof Error) {
    return {
      // Pull all enumerable properties, supporting properties on custom Errors
      ...err,
      // Explicitly pull Error's non-enumerable properties
      name: err.name,
      message: err.message,
      stack: err.stack
    };
  }
  return err;
}

const handleError = (error) =>
  (
    STATUS_CODE_ERROR_MESSAGE[error.status] ||
    STATUS_CODE_ERROR_MESSAGE[Math.round(error.status / 10) * 10] ||
    STATUS_CODE_ERROR_MESSAGE['unknown']
  )(error);

const checkForInternalDemistoError = (response) => {
  const { error, detail } = response || {};
  if (error) {
    const internalDemistoError = Error('Internal Cortex XSOAR Query Error');
    internalDemistoError.status = 'internalDemistoError';
    internalDemistoError.description = `${error} -> ${detail}`;
    internalDemistoError.detail = detail;
    throw internalDemistoError;
  }
  return response;
};

module.exports = { handleError, checkForInternalDemistoError };
