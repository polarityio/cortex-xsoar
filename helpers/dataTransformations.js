const _ = require('lodash');
const Aigle = require('aigle');
const _P = Aigle.mixin(_);

const _partitionFlatMap = (func, partitionSize, collection, parallelLimit = 10) =>
  _P
    .chain(collection)
    .chunk(partitionSize)
    .map((x) => async () => func(x))
    .thru((x) => Aigle.parallelLimit(x, parallelLimit))
    .flatten()
    .value();

const isNullOrEmptyObject = (obj) => {
  if (obj === null) {
    return true;
  }

  if (typeof obj === 'object') {
    return Object.keys(obj).length === 0;
  }

  return false;
};

module.exports = {
  isNullOrEmptyObject,
  _partitionFlatMap,
  _P
};
