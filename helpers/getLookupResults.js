
const _ = require("lodash");
const Aigle = require("aigle");
const _P = Aigle.mixin(_);

const IGNORED_IPS = new Set(["127.0.0.1", "255.255.255.255", "0.0.0.0"]);
const createLookupResults = require("./createLookupResults/index");
const getViolationResponse = require("./getViolationResponse");

const getLookupResults = (entities, options, axiosWithDefaults, Logger) =>
  _partitionFlatMap(async (entitiesPartition) => {
    const entityGroups = _groupEntities(entitiesPartition);

    //requests awaited here

    return [{ entity: entities, data: 1}]
  }, 10, entities);

const _partitionFlatMap = (func, partitionSize, collection, parallelLimit = 10) =>
  _P
    .chain(collection)
    .chunk(partitionSize)
    .map((x) => async () => func(x))
    .thru((x) => Aigle.parallelLimit(x, parallelLimit))
    .flatten()
    .value();

const _groupEntities = (entities) =>
  _.chain(entities)
    .filter(({ isIP, value }) => !isIP || (isIP && !IGNORED_IPS.has(value)))
    .groupBy(({ isIP, isDomain, isEmail }) =>
      isIP ? "ip" : isDomain ? "domain" : isEmail ? "email" : "unknown"
    )
    .value();

module.exports = {
  getLookupResults,
  _groupEntities
};