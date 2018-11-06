import { ObjectID as objectId } from 'mongodb';
import { fromMongo, fromMongoArray } from '../helpers';

export default Repository => ({
  findById: {
    loader: async ids => {
      const items = fromMongoArray(
        await Repository.findMany({
          query: {
            _id: {
              $in: ids.map(objectId),
            },
          },
        }),
      );

      return ids.map(id => items.find(item => item.id.toString() === id.toString()) || null);
    },
    options: {
      cacheKeyFn: key => key.toString(),
    },
  },
  findOne: {
    loader: queries =>
      Promise.all(
        queries.map(query =>
          Repository.findOne(query).then(item => (item ? fromMongo(item) : null)),
        ),
      ),
    options: {
      cacheKeyFn: key => JSON.stringify(key),
    },
  },
  findMany: {
    loader: queries =>
      Promise.all(queries.map((query = {}) => Repository.findMany(query).then(fromMongoArray))),
    options: {
      cacheKeyFn: key => JSON.stringify(key),
    },
  },
  aggregate: {
    loader: pipelines =>
      Promise.all(pipelines.map(pipeline => Repository.aggregate(pipeline).then(fromMongoArray))),
    options: {
      cacheKeyFn: key => JSON.stringify(Repository.toMongoPipeline(key)),
    },
  },
  count: {
    loader: queries => Promise.all(queries.map((query = {}) => Repository.count(query))),
    options: {
      cacheKeyFn: key => JSON.stringify(key),
    },
  },
});
