const fp = require('lodash/fp');
const moment = require('moment');

const { INDICATOR_TYPE_DEFAULTS } = require('./constants');
const { createSummary } = require('./formatDemistoResults');

const createIndicator = async (
  { entity, summary, indicatorComment, reputation, selectedIndicatorType },
  options,
  requestWithDefaults,
  callback,
  Logger
) => {
  try {
    const { body: newlyCreatedIndicator } = await _createIndicatorRequest(
      entity,
      indicatorComment,
      reputation,
      selectedIndicatorType,
      options,
      requestWithDefaults
    );

    if (!newlyCreatedIndicator) {
      const noIndicatorReturnedOnCreationError = new Error(
        'No Indicator Returned On Creation'
      );

      noIndicatorReturnedOnCreationError.description =
        'No Indicator Returned On Creation';

      throw noIndicatorReturnedOnCreationError;
    }

    callback(null, {
      newIndicator: newlyCreatedIndicator,
      newSummary: createSummary([], [newlyCreatedIndicator], [], summary, Logger)
    });
  } catch (error) {
    Logger.error(
      error,
      {
        errors: [error],
        type: typeof error
      },
      'Creating Indicator Failed'
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

const _createIndicatorRequest = (
  entity,
  indicatorComment,
  reputation,
  selectedIndicatorType,
  options,
  requestWithDefaults
) =>
  requestWithDefaults({
    url: `${options.apiUrl}/${options.apiKeyId.length > 0 ? 'xsoar/' : ''}indicator/create`,
    method: 'POST',
    headers: {
      authorization: options.apiKey,
      'x-xdr-auth-id': options.apiKeyId,
      'Content-type': 'application/json'
    },
    body: {
      indicator: {
        value: entity.value,
        indicator_type:
          fp.get('details', selectedIndicatorType) ||
          INDICATOR_TYPE_DEFAULTS[_getEntityType(entity)],
        manualScore: true,
        score: fp.toNumber(reputation),
        ...(indicatorComment && { comments: [{ content: indicatorComment }] })
      },
      seenNow: true
    }
  });

const _getEntityType = ({ isIP, isHash, isDomain, isEmail }) =>
  isIP
    ? 'ip'
    : isDomain
    ? 'domain'
    : isEmail
    ? 'email'
    : isHash &&
      (hashType === 'MD5'
        ? 'md5'
        : hashType === 'SHA1'
        ? 'sha1'
        : hashType === 'SHA256'
        ? 'sha256'
        : 'otherHash');

module.exports = createIndicator;
