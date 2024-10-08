const { getLogger } = require('./logger');

const polarityTypeToCortexType = (entity) => {
  if (entity.types.includes('IPv4') || entity.types.includes('IPv6')) {
    return 'IP';
  }
  if (entity.types.includes('domain')) {
    return 'Domain';
  }
  if (entity.types.includes('email')) {
    return 'Email';
  }
  if (
    entity.types.includes('MD5') ||
    entity.types.includes('SHA1') ||
    entity.types.includes('SHA256')
  ) {
    return 'File';
  }
  if (entity.types.includes('url')) {
    return 'URL';
  }
  return '';
};

const buildSearchQuery = (entitiesPartition, options) => {
  const query = entitiesPartition
    //.map((entity) => `("${entity.value}" AND type:${polarityTypeToCortexType(entity)})`)
    .map((entity) => `"${entity.value}"`)
    .join(' OR ');
  return query;
};

const search = async (entitiesPartition, options, requestWithDefaults) => {
  const Logger = getLogger();

  const requestOptions = {
    url: `${options.apiUrl}/${options.apiKeyId.length > 0 ? 'xsoar/' : ''}search`,
    method: 'POST',
    json: true,
    headers: {
      authorization: options.apiKey,
      'x-xdr-auth-id': options.apiKeyId
    },
    body: {
      filter: {
        query: buildSearchQuery(entitiesPartition, options)
      }
    }
  };

  Logger.trace({ requestOptions }, 'General Search Request Options');

  try {
    const response = await requestWithDefaults(requestOptions);

    if (response.body && !response.body.result) {
      // If there are no search results, result is `null` so we set it to an empty array
      response.body.result = [];
    }

    const formattedResults = response.body.result.reduce(
      (accum, result) => {
        switch (result.type) {
          case 'incident':
            if (result.incidentResult && result.incidentResult.incident) {
              // Add a "synthetic" index to support front-end paging
              result.incidentResult.incident.__index = accum.incidents.length;
              accum.incidents.push({
                highlights: result.incidentResult.highlights,
                highlightsAsString: JSON.stringify(result.incidentResult.highlights).toLowerCase(),
                incident: result.incidentResult.incident
              });
            }
            break;
          case 'evidence':
            if (result.evidenceResult && result.evidenceResult.evidence) {
              // Add a "synthetic" index to support front-end paging
              result.evidenceResult.evidence.__index = accum.evidence.length;
              accum.evidence.push({
                highlights: result.evidenceResult.highlights,
                highlightsAsString: JSON.stringify(result.evidenceResult.highlights).toLowerCase(),
                evidence: result.evidenceResult.evidence
              });
            }
            break;
          case 'indicator':
            if (result.insightResult && result.insightResult.insight) {
              // Add a "synthetic" index to support front-end paging
              result.insightResult.indicator.__index = accum.indicators.length;
              accum.indicators.push({
                highlights: result.insightResult.highlights,
                highlightsAsString: JSON.stringify(result.insightResult.highlights).toLowerCase(),
                indicator: result.insightResult.insight
              });
            }
            break;
        }
        return accum;
      },
      {
        incidents: [],
        evidence: [],
        indicators: []
      }
    );
    return formattedResults;
  } catch (error) {
    Logger.error(error, 'General Search Error');
    throw error;
  }
};

module.exports = search;
