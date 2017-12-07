import { ObjectID as objectId } from 'mongodb';
import omit from 'lodash/omit';
import { fromMongoCursor, fromMongo } from './helpers';

export const createCRUDResolvers = ({
  getRepository,
  getLoaders,
  canDelete = () => true,
  canUpdate = () => true,
  findManyQuery = () => ({}),
  findOneQuery = ({ id }) => ({ query: { _id: id } }),
  countQuery = () => ({}),
}) => ({
  findById: (_, { id }, ctx) => getLoaders(ctx).findById.load(id),
  findOne: (_, args, ctx) => getLoaders(ctx).findOne.load(findOneQuery(args, ctx)),
  findMany: (_, args, ctx) => getLoaders(ctx).findMany.load(findManyQuery(args, ctx)),
  count: (_, args, ctx) =>
    getRepository(ctx).count({
      query: countQuery(args, ctx),
    }),
  createOne: async (_, { input }, ctx) => fromMongo(await getRepository(ctx).createOne(input)),
  updateOne: async (_, args, ctx) => {
    const { id, input, item: loadedItem } = args;
    const Repository = getRepository(ctx);
    const item = loadedItem || (await Repository.findOne(findOneQuery(args, ctx)));

    if (!item) {
      throw new Error(`Unable to find item with id: ${id}!`);
    }

    if (!canUpdate(ctx.user, item)) {
      throw new Error('Not Allowed!');
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
  deleteOne: async (_, args, ctx) => {
    const { id, item: loadedItem } = args;
    const Repository = getRepository(ctx);
    const item = loadedItem || (await Repository.findOne(findOneQuery(args, ctx)));

    if (!item) {
      throw new Error(`Unable to find item with id: ${id}!`);
    }

    if (!canDelete(ctx.user, item)) {
      throw new Error('Not Allowed!');
    }

    return fromMongo(await Repository.deleteOne({ query: { _id: item._id } }));
  },
});

export const createLoaders = Repository => ({
  findById: {
    loader: async ids => {
      const items = await Repository.findMany({
        query: {
          _id: {
            $in: ids.map(objectId),
          },
        },
      }).then(fromMongoCursor);

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
      Promise.all(queries.map((query = {}) => Repository.findMany(query).then(fromMongoCursor))),
    options: {
      cacheKeyFn: key => JSON.stringify(key),
    },
  },
  count: {
    loader: queries => Promise.all(queries.map((query = {}) => Repository.count(query))),
    options: {
      cacheKeyFn: key => JSON.stringify(key),
    },
  },
});
