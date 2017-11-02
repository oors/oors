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
