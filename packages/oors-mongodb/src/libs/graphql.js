import { ObjectID as objectId } from 'mongodb';
import omit from 'lodash/omit';
import { fromMongoCursor } from './helpers';

export const createCRUDResolvers = ({ getRepository, getLoaders }) => ({
  findOne: (_, { id }, ctx) => getLoaders(ctx).findOne.load(id),
  findMany: (_, args, ctx) => getLoaders(ctx).findMany.load(),
  createOne: async (_, { input }, ctx) => ctx.fromMongo(await getRepository(ctx).createOne(input)),
  updateOne: async (_, { id, input }, ctx) => {
    const { fromMongo } = ctx;
    const Repository = getRepository(ctx);
    const item = await Repository.findById(objectId(id));

    if (!item) {
      throw new Error(`Unable to find item with id: ${id}!`);
    }

    await Repository.validate(
      omit(
        {
          ...item,
          ...input,
        },
        ['_id'],
      ),
    );

    return fromMongo(
      await Repository.updateOne({
        query: {
          _id: item._id,
        },
        update: {
          $set: input,
        },
      }),
    );
  },
  deleteOne: async (_, { id }, ctx) => {
    const { fromMongo } = ctx;
    const Repository = getRepository(ctx);
    const item = await Repository.findById(objectId(id));

    if (!item) {
      throw new Error(`Unable to find item with id: ${id}!`);
    }

    return fromMongo(await Repository.deleteOne({ query: { _id: item._id } }));
  },
});

export const createLoaders = Repository => ({
  findById: {
    loader: ids =>
      Repository.findMany({
        query: {
          _id: {
            $in: ids.map(objectId),
          },
        },
      }).then(fromMongoCursor),
    options: {
      cacheKeyFn: key => key.toString(),
    },
  },
  findOne: {
    loader: queries =>
      Promise.all(
        queries.map(query =>
          Repository.findOne({
            query,
          }).then(fromMongoCursor),
        ),
      ),
    options: {
      cacheKeyFn: key => JSON.stringify(key),
    },
  },
  findMany: {
    loader: queries =>
      Promise.all(
        queries.map(query =>
          Repository.findMany({
            query,
          }).then(fromMongoCursor),
        ),
      ),
    options: {
      cacheKeyFn: key => JSON.stringify(key),
    },
  },
});
