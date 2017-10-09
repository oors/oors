import { ObjectID as objectId } from 'mongodb';

export const idToQuery = id => ({ _id: objectId(id) });

export const fromMongo = item => ({
  ...item,
  id: item._id.toString(),
});

export const toMongo = item => ({
  ...item,
  _id: objectId(item.id),
});
