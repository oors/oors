import { ObjectID as objectId } from 'mongodb';
import EJSON from 'mongodb-extended-json';

export const toBSON = query =>
  EJSON.parse(typeof query !== 'string' ? JSON.stringify(query) : query);

export const idToQuery = id => ({ _id: objectId(id) });

export const idPattern = /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i;

export const fromMongo = item => ({
  ...item,
  id: item._id.toString(),
});

export const fromMongoCursor = data => data.map(fromMongo).toArray();

export const fromMongoArray = data => data.map(fromMongo);

export const toMongo = item => ({
  ...item,
  _id: objectId(item.id),
});

export const parseMongoQuery = params => {
  const query = {};

  if (params.orderBy) {
    query.orderBy = params.orderBy;
  }

  if (params.filters) {
    query.query = toBSON(params.query);
  }

  if (params.offset !== undefined) {
    query.skip = parseInt(params.offset, 10);
  }

  if (params.limit !== undefined) {
    query.limit = parseInt(params.limit, 10);
  }

  return query;
};

export const buildSort = orderBy =>
  Object.keys(orderBy).reduce(
    (acc, field) => ({
      ...acc,
      [field]:
        orderBy[field] === 1 ||
        (typeof orderBy[field] === 'string' && orderBy[field].toLowerCase() === 'asc')
          ? 1
          : -1,
    }),
    {},
  );

export const queryToPipeline = ({ query, orderBy, skip, limit }, pipeline = []) => {
  if (query) {
    pipeline.push({
      $match: query,
    });
  }

  if (orderBy) {
    pipeline.push({
      $sort: buildSort(orderBy),
    });
  }

  if (skip) {
    pipeline.push({
      $skip: skip,
    });
  }

  if (limit) {
    pipeline.push({
      $limit: limit,
    });
  }

  return pipeline;
};

export const getTimestampFromMigrationFile = file => {
  const fileName = file.substr(file.lastIndexOf('/') + 1);
  return fileName.substr(0, fileName.indexOf('_'));
};
